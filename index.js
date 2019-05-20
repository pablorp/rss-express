const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
const Parser = require('rss-parser');
const parser = new Parser();
const read = require('node-readability');
const moment = require('moment');
const Store = require('data-store');
const store = new Store({ path: 'store.json' });
const router = express.Router();

app.engine('.hbs', exphbs({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', '.hbs');

app.use(express.urlencoded())
app.use(express.json());
app.set('base', '/rss');

const PORT = 5001

//--------------------------------------------------------

let _feeds = []

router.get('/', (req, res) => {
  _feeds.forEach(f => {
    let n = 0
    f.items.forEach(i => {
      if (!i.read) n++
    })
    f.new = n
  })

  res.render('index', {
    feeds: _feeds
  });
});


router.get('/f/:id', (req, res) => {
  let feed = _feeds.find(i => i.id == req.params.id)

  res.render('feed', {
    items: feed.items,
    id: req.params.id
  });
});


router.get('/f/:id/read', (req, res) => {
  let feed = _feeds.find(i => i.id == req.params.id)

  feed.items.forEach(i => {
    i.read = true
  })

  res.redirect('/')
});


router.get('/upgrade', (req, res) => {

  _feeds.forEach(f => {
    f.items.forEach(i => {
      i.read = false
    })
  })


  res.redirect('/')
});


router.get('/persist', (req, res) => {
  guardarFeeds(_feeds)
  res.redirect('/')
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


router.get('/reset', (req, res) => {
  store.set('feeds', [])
  res.send('ok')
});


router.get('/data', (req, res) => {
  res.json(_feeds)
});


router.get('/add', (req, res) => {
  res.render('add')
});


router.post('/add', (req, res) => {
  let name = req.body.name
  let url = req.body.url

  let id = 1;

  _feeds.forEach(f => {
    if (f.id > id) id = f.id
  })

  let nuevoFeed = {
    id: id + 1,
    name: name,
    url: url,
    items: []
  }

  _feeds.push(nuevoFeed)

  console.log('feed añadido: ' + nuevoFeed)
  _feeds.forEach(f => {
    console.log(f.name)
  })

  actualizarFeeds()

  res.json(_feeds)
});


router.get('/del/:id', (req, res) => {
  let index = _feeds.findIndex(i => i.id == req.params.id)
  _feeds.splice(index, 1)
  res.send('ok')
});


router.post('/restore', (req, res) => {
  _feeds = req.body
  res.json(_feeds)
})

app.use('/rss', router);

//-------------------------------------------------------------

if (!getFeeds()) {
  guardarFeeds([])
} else {
  _feeds = _feeds.concat(getFeeds())
}

function actualizarFeeds() {
  console.log('Actualizando feeds')
  _feeds.forEach(feed => {
    parser.parseURL(feed.url, (err, respFeed) => {
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
      }
    })
  })
}

function getFeeds() {
  return store.get('feeds')
}

function guardarFeeds(feedsTmp) {
  store.set('feeds', feedsTmp)
}

actualizarFeeds()

setInterval(() => {
  actualizarFeeds()
  guardarFeeds(_feeds)
}, 5 * 60 * 1000)


app.listen(PORT, () => {
  console.log('app is running → PORT ' + PORT);
});
