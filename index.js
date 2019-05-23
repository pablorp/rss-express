const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
const Parser = require('rss-parser');
const parser = new Parser();
const read = require('node-readability');
const moment = require('moment');
const Store = require('data-store');
const store = new Store({
  path: 'store.json'
});
const router = express.Router();
const mongo = require('mongodb').MongoClient
require('dotenv').config()

let db = null
let client = null
let col = null

app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', '.hbs');

app.use(express.urlencoded())
app.use(express.json());
app.set('base', '/rss');


//--------------------------------------------------------

router.get('/', async (req, res) => {
  let feeds = await getFeeds()

  feeds.forEach(f => {
    let n = 0
    f.items.forEach(i => {
      if (!i.read) n++
    })
    f.new = n
  })

  res.render('index', {
    feeds: feeds
  });

});


router.get('/f/:id', async (req, res) => {
  let feed = await getFeed(req.params.id)

  console.log(feed)

  res.render('feed', {
    items: feed.items,
    id: req.params.id
  });
});


router.get('/f/:id/read', async (req, res) => {
  let feed = await getFeed(req.params.id)

  feed.items.forEach(i => {
    i.read = true
  })

  await guardarFeed(feed)

  res.redirect('/rss')
});


router.get('/txt/:link', (req, res) => {
  let link = decodeURIComponent(req.params.link)

  read(link, (err, article) => {
    if (err) {
      console.log(err)
    } else {
      res.render('text', {
        title: article.title,
        text: article.content
      });
    }
  })

});


router.get('/add', (req, res) => {
  res.render('add')
});


router.post('/add', async (req, res) => {
  let name = req.body.name
  let url = req.body.url

  let id = 1;

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

  res.redirect('/rss')
});


router.get('/del/:id', async (req, res) => {
  await deleteFeed(req.params.id)
  res.send('ok')
});


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
  await col.replaceOne({
    id: feed.id
  }, feed)
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

        await col.replaceOne({
          id: feed.id
        }, feed)
      }
    })
  })
}

function guardarFeeds(feedsTmp) {
  store.set('feeds', feedsTmp)
}

//----------------------------------------------------------

async function main() {
  try {
    client = await mongo.connect(process.env.DATABASE_URL)
    db = client.db('dbtest1')
    col = db.collection('rss')

    console.log('conectado')

    actualizarFeeds()

    setInterval(() => {
      actualizarFeeds()
    }, 5 * 60 * 1000)

    app.use('/rss', router);

    app.listen(process.env.PORT, () => {
      console.log('app is running → PORT ' + process.env.PORT);
    });

  } catch (err) {
    console.error(err)
  }
}

main()