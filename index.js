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



let feeds = [
    {id: 1, name: 'Verge', url: 'https://theverge.com/rss/index.xml', items: []},    
    {id: 2, name: 'Polygon', url: 'https://polygon.com/rss/index.xml', items: []},
    {id: 3, name: 'Eurogamer', url: 'http://www.eurogamer.net/?format=rss', items: []},
    {id: 4, name: 'Anait', url: 'http://www.anaitgames.com/feed/', items: []},
    {id: 5, name: 'Genbeta', url: 'http://feeds.weblogssl.com/genbeta', items: []},
    {id: 6, name: 'Zona Negativa', url: 'http://www.zonanegativa.com/?feed=rss', items: []},
    {id: 7, name: 'Fantifica', url: 'http://www.fantifica.com/feed', items: []},
    {id: 8, name: 'Fancueva', url: 'http://feeds.feedburner.com/fancueva', items: []},
    {id: 9, name: 'Espinof', url: 'http://www.vayatele.com/index.xml', items: []},
    {id: 10, name: 'Papel en Blanco', url: 'http://feeds.feedburner.com/PapelEnBlanco2', items: []},
]









app.get('/f/:id', (req, res) => {
  let feed = feeds.find(i => i.id == req.params.id)
  
  res.render('feed', {
      items: feed.items
  });
});



app.get('/', (req, res) => {
  res.render('index', {
      feeds: feeds
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
  store.del('feeds')
  res.send('ok')
});


//-------------------------------------------------------------

if (!store.has('feeds')) {
    store.set('feeds', feeds)
} else {
    let feedsTmp = store.get('feeds')
    feeds.forEach(f => {
      if (feedsTmp.filter(x => x.id == f.id).length == 0) {
        feedsTmp.push(f)
      }
    })
    store.set('feeds', feedsTmp)
    feeds = store.get('feeds')
}



function actualizarFeeds() {
  feeds.forEach(feed => {
        
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
            
            store.set('feeds', feeds)
            
          }
        })
        
    })
}



actualizarFeeds()

setInterval(() => {
  console.log('Actualizando feeds')
  actualizarFeeds()
}, 30 * 1000)


app.listen(process.env.PORT, () => {
  console.log('app is running → PORT ' + process.env.PORT);
});