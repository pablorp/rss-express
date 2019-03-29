const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
const Parser = require('rss-parser');
const parser = new Parser();
const read = require('node-readability');
const moment = require('moment');
const Store = require('data-store');
const store = new Store({ path: 'store.json' });



// Register Handlebars view engine
app.engine('.hbs', exphbs({defaultLayout: 'main', extname: '.hbs'}));
// Use Handlebars view engine
app.set('view engine', '.hbs');

app.use(express.urlencoded())



let _feeds = []

app.get('/f/:id', (req, res) => {
  let feed = _feeds.find(i => i.id == req.params.id)
  
  res.render('feed', {
      items: feed.items
  });
});



app.get('/', (req, res) => {
  res.render('index', {
      feeds: _feeds
  });
});




app.get('/txt/:link', (req, res) => {
  
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




app.get('/reset', (req, res) => {
  store.set('feeds', [])
  res.send('ok')
});




app.get('/data', (req, res) => {
  res.json(_feeds)
});



app.get('/add', (req, res) => {
  res.render('add')
});




app.post('/add', (req, res) => {
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




app.get('/del/:id', (req, res) => {
  let index = _feeds.findIndex(i => i.id == req.params.id)
  _feeds.splice(index, 1)
  res.send('ok')
});


//-------------------------------------------------------------

if (!getFeeds()) {
    guardarFeeds([])
} else {
    _feeds = _feeds.concat(getFeeds())
}



function actualizarFeeds() {
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
                  decodedLink: encodeURIComponent(x.link)  
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
  console.log('Actualizando feeds')
  actualizarFeeds()
  guardarFeeds(_feeds)
}, 5 * 60 * 1000)


app.listen(process.env.PORT, () => {
  console.log('app is running → PORT ' + process.env.PORT);
});