const moment = require('moment')
const mongo = require('mongodb').MongoClient
const Parser = require('rss-parser')
const parser = new Parser()

require('dotenv').config()

let db = null
let client = null
let col = null

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
    } catch (err) {
        console.error(err)
    }
}

main()
