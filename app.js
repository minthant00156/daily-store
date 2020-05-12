'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  app = express().use(body_parser.json());
var admin = require("firebase-admin");

var ServiceAccount = require("./ServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://the-daily-store-60ea9.firebaseio.com"
})
var db=admin.firestore();
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  let body = req.body;



  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function (entry) {

      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        if (webhook_event.message.quick_reply) {
          handleQuickReply(sender_psid, webhook_event.message.quick_reply.payload);
        } else {
          handleMessage(sender_psid, webhook_event.message);
        }
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


app.get('/setgsbutton', function (req, res) {
  setupGetStartedButton(res);
});

app.get('/setpersistentmenu', function (req, res) {
  setupPersistentMenu(res);
});

app.get('/clear', function (req, res) {
  removePersistentMenu(res);
});

//whitelist domains
//eg https://newhope-grocery-store.herokuapp.com/whitelists
app.get('/whitelists', function (req, res) {
  whitelistDomains(res);
});


// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {

  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];



  // Check if a token and mode were sent
  if (mode && token) {


    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Respond with 200 OK and challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

/**********************************************
Function to Handle when user send text message
***********************************************/

const handleMessage = (sender_psid, received_message) => {
  let user_message = received_message.text.toLowerCase();

  switch (user_message) {
    case "hi":
      greetUser(sender_psid);
      break;
      break;
    default:
      defaultReply(sender_psid);
  }
}

/****************************************************
Function to Handle when user send quick reply message
*****************************************************/

function handleQuickReply(sender_psid, received_message) {

  switch (received_message) {
    case "electric":
      electric(sender_psid);
      break;
    default:
      defaultReply(sender_psid);
  }

}

/*********************************************
Function to handle when user click button
**********************************************/
const handlePostback = (sender_psid, received_postback) => {
  let payload = received_postback.payload;

  switch (payload) {
    case "get_started":
      greetUser(sender_psid);
      break;
    case "search-products":
      searchProducts(sender_psid);
      break;
    case "search-by-category":
      searchByCategory(sender_psid);
      break;
    case "electronic":
      electronic(sender_psid);
      break;
    case "clothing":
      clothing(sender_psid);
      break;
    case "women-clothing":
      womenClothing(sender_psid);
      break;
    case "cosmetic":
      cosmetic(sender_psid);
      break;
    default:
      defaultReply(sender_psid);
  }
}

const callSendAPI = (sender_psid, response) => {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/v2.6/me/messages",
      "qs": {
        "access_token": PAGE_ACCESS_TOKEN
      },
      "method": "POST",
      "json": request_body
    }, (err, res, body) => {
      if (!err) {
        resolve('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    });
  });
}

async function callSend(sender_psid, response) {
  let send = await callSendAPI(sender_psid, response);
  return 1;
}

const getUserProfile = (sender_psid) => {
  return new Promise(resolve => {
    request({
      "uri": "https://graph.facebook.com/" + sender_psid + "?fields=first_name,last_name,profile_pic&access_token=EAAC0Amc4MRgBAGR5JMXzFDQBBZCbHRjOkVPeKg3UokgQzZAYlIAZBQoPnwsKo6FZBmSOd5kPm16TUJEFdveL9iZA4IAG2EN1IozqH17jKueHNU2rPObJYjxkL6Kq3WttHxYhaj83SGYNK9ZBEtYXkJTOiXVV9key1xS8WZCpWXoQy3bluiMysR5IYlm1Q9QfVQZD",
      "method": "GET"
    }, (err, res, body) => {
      if (!err) {
        let data = JSON.parse(body);
        resolve(data);
      } else {
        console.error("Error:" + err);
      }
    });
  });
}


async function greetUser(sender_psid) {
  let user = await getUserProfile(sender_psid);
  let response1 = {
    "text": "မင်္ဂလာပါ " + user.first_name + " " + user.last_name + ""
  };
  let response2 = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "What do you want to eat?",
        "buttons": [{
            "type": "postback",
            "title": "My Points",
            "payload": "my-points"
          },
          {
            "type": "postback",
            "title": "Search Products",
            "payload": "search-products"
          }
        ]
      }
    }
  };
  callSend(sender_psid, response1).then(() => {
    return callSend(sender_psid, response2);
  });
}

const searchProducts = (sender_psid) => {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
            "title": "Electronic accessories",
            "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcQSBSBlV-8KfXJ75HH-Hq4DcwyPFnulr6f3Pm2LT98uh5mW6sfz&usqp=CAU",
            "subtitle": "Discover the best Electronics Accessories & Supplies in Best Sellers.",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "electronic"
            }]
          },
          {
            "title": "Cosmetic",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "cosmetic"
            }]
          },
          {
            "title": "Clothing",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "clothing"
            }]
          },
          {
            "title": "Fancy",
            "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn%3AANd9GcR-6idUYyyoSTrR7Nw3AFA89gRRl_WRvNZHCiUQduMnjeH7RF8n&usqp=CAU",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "ch-four-ingre"
            }]
          },
          {
            "title": "Other Accessories",
            "image_url": "https://static-01.shop.com.mm/original/736bd78e8568560a3e4488478afa1262.jpg",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "ch-five-ingre"
            }]
          }
        ]
      }
    }
  }
  callSend(sender_psid, response);
}

const electronic = (sender_psid) => {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
            "title": "Headphone",
            "image_url": "https://i.imgur.com/NyJj3PY.jpg",
            "subtitle": "point - 50",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-one-ingre"
            }]
          },
          {
            "title": "Earphone",
            "image_url": "https://i.imgur.com/xYD02vl.jpg",
            "subtitle": "point - 30",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-two-ingre"
            }]
          },
          {
            "title": "Power Bank",
            "image_url": "https://i.imgur.com/UojaGG7.jpg",
            "subtitle": "point - 45",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-three-ingre"
            }]
          },
          {
            "title": "Table Lamp",
            "image_url": "https://i.imgur.com/PxLFwAJ.jpg",
            "subtitle": "point - 60",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-four-ingre"
            }]
          },
          {
            "title": "Digital Table Watch",
            "image_url": "https://i.imgur.com/DrquX82.jpg",
            "subtitle": "point - 100",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Digital Watch",
            "image_url": "https://i.imgur.com/uZzrltE.jpg",
            "subtitle": "point - 200",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Stand Fan",
            "image_url": "https://i.imgur.com/sdVoLrd.jpg",
            "subtitle": "point - 200",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Phone",
            "image_url": "https://i.imgur.com/TFQcdTb.jpg",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Flat Tv",
            "image_url": "https://i.imgur.com/Xpt28x4.jpg",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
        ]
      }
    }
  }
  callSend(sender_psid, response);
}

const clothing = (sender_psid) => {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
            "title": "Men",
            "image_url": "https://www.edrawsoft.com/images/fashion/mansuit3.png",
            "subtitle": "Discover the best Electronics Accessories & Supplies in Best Sellers.",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "electronic"
            }]
          },
          {
            "title": "Women",
            "image_url": "https://www.e-marrige.net/wp-content/uploads/2015/12/women-clothing.jpg",
            "subtitle": "point - 1000",
            "buttons": [{
              "type": "postback",
              "title": "View",
              "payload": "women-clothing"
            }]
          }
        ]
      }
    }
  }
  callSend(sender_psid, response);
}

const womenClothing = (sender_psid) => {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
            "title": "T shirt",
            "image_url": "https://i.imgur.com/jrHH3CS.jpg",
            "subtitle": "point - 20",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-one-ingre"
            }]
          },
          {
            "title": "Summer Shirt",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 30",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-two-ingre"
            }]
          },
          {
            "title": "Hoodies",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 50",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-three-ingre"
            }]
          },
          {
            "title": "Jeans Short pant",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 45",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-four-ingre"
            }]
          },
          {
            "title": "Jeans Long Pant",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point -",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Sport Wear Set",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 100",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "School Skirt",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 60",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
          {
            "title": "Bikini Set",
            "image_url": "https://static.independent.co.uk/s3fs-public/thumbnails/image/2019/04/10/16/online-clothes-shops-hero.jpg?w968h681",
            "subtitle": "point - 80",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          },
        ]
      }
    }
  }
  callSend(sender_psid, response);
}

const cosmetic = (sender_psid) => {
  let response;
  response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [{
            "title": "Lipstick",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point -10",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-one-ingre"
            }]
          },
          {
            "title": "Masakara",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point - 10",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-two-ingre"
            }]
          },
          {
            "title": "Perfume",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point - 50",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-three-ingre"
            }]
          },
          {
            "title": "Make Up Powder",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point - 40",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-four-ingre"
            }]
          },
          {
            "title": "Hair spray",
            "image_url": "https://lh3.googleusercontent.com/proxy/zXb0A7655SNaUDeDpOzowoOnyoSaz0MXuOjzMRWJTxzV-zpg4gCIzKZ3XtWaY0E-D_ebGq_nNfKyb5XPQHl2QTzsgoAmkh_QnSpgN3xM5LzSt4GilTxwOHM_3lIcOnboZodbKe1p_p4NH9cvtXs67iw2hil92qFxSrhUu0xiS83KvyVy",
            "subtitle": "point - 15",
            "buttons": [{
              "type": "postback",
              "title": "Get",
              "payload": "ch-five-ingre"
            }]
          }
        ]
      }
    }
  }
  callSend(sender_psid, response);
}

function setupGetStartedButton(res) {
  var messageData = {
    "get_started": {
      "payload": "get_started"
    }
  };
  // Start the request
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // Print out the response body
        res.send(body);
      } else {
        // TODO: Handle errors
        res.send(body);
      }
    });
}

function setupPersistentMenu(res) {
  var messageData = {
    "persistent_menu": [{
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [{
            "title": "Menu",
            "type": "nested",
            "call_to_actions": [{
                "title": "My Points",
                "type": "postback",
                "payload": "my-orders"
              },
              {
                "title": "Search Products",
                "type": "postback",
                "payload": "search-products"
              }
            ]
          },
          {
            "type": "web_url",
            "title": "Visit website",
            "url": "http://www.google.com",
            "webview_height_ratio": "full"
          }
        ]
      },
      {
        "locale": "zh_CN",
        "composer_input_disabled": false
      }
    ]
  };
  // Start the request
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // Print out the response body
        res.send(body);

      } else {
        // TODO: Handle errors
        res.send(body);
      }
    });
}



function removePersistentMenu(res) {
  var messageData = {
    "fields": [
      "persistent_menu",
      "get_started"
    ]
  };
  // Start the request
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // Print out the response body
        res.send(body);

      } else {
        // TODO: Handle errors
        res.send(body);
      }
    });
}

/***********************************
FUNCTION TO ADD WHITELIST DOMAIN
************************************/

const whitelistDomains = (res) => {
  var messageData = {
    "whitelisted_domains": [
      "https://new-hope-a1a0b.web.app",
      "https://firebase.google.com"
    ]
  };
  request({
      url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      form: messageData
    },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.send(body);
      } else {
        res.send(body);
      }
    });
}