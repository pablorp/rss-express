const express = require('express');
const exphbs = require('express-handlebars');
const app = express();
const Parser = require('rss-parser');
const parser = new Parser();
const read = require('node-readability');
const Store = require('data-store');
const store = new Store({ path: 'store.json' });


let feeds = [
    {id: 1, name: 'Verge', url: 'https://theverge.com/rss/index.xml', items: []},    
    {id: 2, name: 'Polygon', url: 'https://polygon.com/rss/index.xml', items: []},
]




if (!store.has('feeds')) {
    store.set('feeds', feeds)
} else {
    feeds = store.get('feeds')
}

console.log(store.data)



setInterval(() => {
    
    feeds.forEach(feed => {
        
        parser.parseURL(feed.url, (err, respFeed) => {
          if (err) {
            console.log(err)
          } else {
            let items = respFeed.items.map(x => {
              return { 
                  link: x.link,
                  title: x.title,
                  pubDate: x.pubDate,
                  decodedLink: encodeURIComponent(x.link)  
              }
            })
            
            items.forEach(item => {
                
                console.log('checking item')
                
                console.log(feed.items)
                
                if (feed.items.length == 0 || feed.items.filter(x => x.title == item.title).length == 0) {
                    console.log('adding item')
                    feed.items.push(item)
                }
                
            })
            
            
            store.set('feeds', feeds)
            
          }
        })
        
    })
    
    console.log(store.get('feeds'))
    
}, 5 * 1000)