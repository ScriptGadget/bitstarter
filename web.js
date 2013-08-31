// Define routes for simple SSJS web app. 
// Writes Coinbase orders to database.
var async   = require('async')
  , express = require('express')
  , fs      = require('fs')
  , http    = require('http')
  , https   = require('https')
  , db      = require('./models');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 8080);

app.use(express.bodyParser());

// Render homepage (note trailing slash): example.com/
app.get('/', function(request, response) {
  var data = fs.readFileSync('index.html').toString();
  response.send(data);
});

// Render example.com/orders
app.get('/orders', function(request, response) {
  global.db.Order.findAll().success(function(orders) {
    var orders_json = [];
    orders.forEach(function(order) {
      orders_json.push({id: order.coinbase_id, amount: order.amount, time: order.time});
    });
    // Uses views/orders.ejs
    response.render("orders", {orders: orders_json});
  }).error(function(err) {
    console.log(err);
    response.send("error retrieving orders");
  });
});

// Hit this URL while on example.com/orders to refresh
app.get('/refresh_orders', function(request, response) {
  https.get("https://coinbase.com/api/v1/orders?api_key=" + process.env.COINBASE_API_KEY, function(res) {
    var body = '';
    res.on('data', function(chunk) {body += chunk;});
    res.on('end', function() {
      try {
        var orders_json = JSON.parse(body);
        if (orders_json.error) {
          response.send(orders_json.error);
          return;
        }
        // add each order asynchronously
        async.forEach(orders_json.orders, addOrder, function(err) {
          if (err) {
            console.log(err);
            response.send("error adding orders");
          } else {
            // orders added successfully
            response.redirect("/orders");
          }
        });
      } catch (error) {
        console.log(error);
        response.send("error parsing json");
      }
    });

    res.on('error', function(e) {
      console.log(e);
      response.send("error syncing orders");
    });
  });

});

// sync the database and start the server
db.sequelize.sync().complete(function(err) {
  if (err) {
    throw err;
  } else {
    http.createServer(app).listen(app.get('port'), function() {
      console.log("Listening on " + app.get('port'));
    });
  }
});

// add order to the database if it doesn't already exist
var addOrder = function(order_obj, callback) {
  var order = order_obj.order; // order json from coinbase
  if (order.status != "completed") {
    // only add completed orders
    callback();
  } else {
    var Order = global.db.Order;
    // find if order has already been added to our database
    Order.find({where: {coinbase_id: order.id}}).success(function(order_instance) {
      if (order_instance) {
        // order already exists, do nothing
        callback();
      } else {
        // build instance and save
          var new_order_instance = Order.build({
          coinbase_id: order.id,
          amount: order.total_btc.cents / 100000000, // convert satoshis to BTC
          time: order.created_at
        });
          new_order_instance.save().success(function() {
          callback();
        }).error(function(err) {
          callback(err);
        });
      }
    });
  }
};

// Register a claim
app.post('/claim', function(request, response) {
    try {
	global.db.Claim.create({
	    email: request.body.email,
	    latitude: request.body.latitude,
	    longitude: request.body.longitude,
	    size: request.body.size,
	    name: request.body.name,
	    description: request.body.description,
	}).success(function(claim) {
	    response.send(JSON.stringify([{
		message: "Thank You",
		id: claim.id,
		size: claim.size,
		longitude: claim.longitude,
		latitude: claim.latitude}]));
	}).error(function(error) {
	    console.log(error);
	    response.send(JSON.stringify([{error: "Error adding claim: " + error}]));
	});
    } catch (error) {
	console.log(error);
	response.send(JSON.stringify([{error: "Error adding claim: " + error}]));
    }
});
