const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const Parser = require('rss-parser')
const parser = new Parser()
const moment = require('moment')
const router = express.Router()
const mongo = require('mongodb').MongoClient
const { extract } = require('article-parser')

require('dotenv').config()

let db = null
let client = null
let col = null

app.engine(
    '.hbs',
    exphbs({
        defaultLayout: 'main',
        extname: '.hbs'
    })
)
app.set('view engine', '.hbs')

app.use(express.urlencoded())
app.use(express.json())
app.set('base', process.env.URL_BASE)

//--------------------------------------------------------

router.get('/', async (req, res) => {
    let feeds = await getFeeds()

    feeds.sort((a, b) => {
        return a.id - b.id
    })

    feeds.forEach(f => {
        let n = 0
        f.items.forEach(i => {
            if (!i.read) n++
        })
        f.new = n
    })

    res.render('index', {
        feeds: feeds,
        url_base: process.env.URL_BASE
    })
})

router.get('/f/:id', async (req, res) => {
    let feed = await getFeed(req.params.id)

    res.render('feed', {
        items: feed.items,
        id: req.params.id,
        url_base: process.env.URL_BASE
    })
})

router.get('/f/:id/read', async (req, res) => {
    let feed = await getFeed(req.params.id)

    feed.items.forEach(i => {
        i.read = true
    })

    await guardarFeed(feed)

    res.redirect(process.env.URL_BASE)
})

router.get('/txt/:link', (req, res) => {
    let link = decodeURIComponent(req.params.link)

    extract(link)
        .then(article => {
            console.log(article)
            res.render('text', {
                title: article.title,
                text: article.content,
                url_base: process.env.URL_BASE
            })
        })
        .catch(err => {
            console.log(err)
        })
})

router.get('/add', (req, res) => {
    res.render('add', {
        url_base: process.env.URL_BASE
    })
})

router.post('/add', async (req, res) => {
    let name = req.body.name
    let url = req.body.url

    let id = 1

    let feeds = await getFeeds()

    feeds.forEach(f => {
        if (f.id > id) id = f.id
    })

    let nuevoFeed = {
        id: id + 1,
        name: name,
        url: url,
        items: []
    }

    crearFeed(nuevoFeed)

    actualizarFeeds()

    res.redirect(process.env.URL_BASE)
})

router.get('/del/:id', async (req, res) => {
    await deleteFeed(req.params.id)
    res.send('ok')
})

//-------------------------------------------------------------

async function getFeeds() {
    let feeds = await col.find().toArray()
    return feeds
}

async function getFeed(id) {
    id = Number(id)
    let feed = await col.findOne({
        id: id
    })
    return feed
}

async function guardarFeed(feed) {
    await col.replaceOne(
        {
            id: feed.id
        },
        feed
    )
}

async function crearFeed(feed) {
    await col.insertOne(feed)
}

async function deleteFeed(id) {
    id = Number(id)
    await col.deleteOne({
        id: id
    })
}

async function actualizarFeeds() {
    console.log('Actualizando feeds')

    let feeds = await col.find().toArray()

    feeds.forEach(feed => {
        parser.parseURL(feed.url, async (err, respFeed) => {
            if (err) {
                console.log(err)
            } else {
                let items = respFeed.items.map(x => {
                    return {
                        link: x.link,
                        title: x.title,
                        date: Date.parse(x.isoDate),
                        dateFormat: moment(x.isoDate).format('D-M-YYYY, HH:mm:ss'),
                        decodedLink: encodeURIComponent(x.link),
                        read: false
                    }
                })

                items.forEach(item => {
                    if (feed.items.length == 0 || feed.items.filter(x => x.title == item.title).length == 0) {
                        feed.items.push(item)
                    }
                })

                feed.items.sort((a, b) => b.date - a.date)

                if (feed.items.length > 500) {
                    feed.items = feed.items.slice(0, 500)
                }

                await col.replaceOne(
                    {
                        id: feed.id
                    },
                    feed
                )
            }
        })
    })
}

//----------------------------------------------------------

async function main() {
    try {
        client = await mongo.connect(process.env.DATABASE_URL)
        db = client.db('rss')
        col = db.collection('feeds')

        console.log('conectado')

        app.use(process.env.URL_BASE, router)

        app.listen(process.env.PORT, () => {
            console.log('app is running → PORT ' + process.env.PORT)
        })
    } catch (err) {
        console.error(err)
    }
}

main()
