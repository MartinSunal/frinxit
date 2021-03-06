
var vorpal = require('vorpal')();
var request = require('superagent');
const less = require('vorpal-less');
const grep = require('vorpal-grep');

var current_delimiter = 'frinxit';
var odl_ip = '127.0.0.1';
var odl_user = "admin";
var odl_pass = "admin";

exports.odl_ip = odl_ip;
exports.odl_user = odl_user;
exports.odl_pass = odl_pass;

vorpal
  .delimiter('frinxit$')
  .use(require('./l3vpn.js'))
  .use(require('./cluster.js'))
  .use(less)
  .use(grep)
  .show();


vorpal
  .command('connect <node_name>')
  .description('Connects to netconf node.')
  .hidden()
  .alias('con')
  .action(function(args, callback) {
      current_delimiter = args.node_name;
      this.delimiter('<' + current_delimiter + '>$');
    callback();
  });


vorpal
  .command('exec cli [node_id]')
  .description('Execeutes an arbitray CLI command via the CLI plugin associated' + 
    ' with that device. Response is non-structured.')
  .hidden()

  .action(function(args, callback) {
    var self = this;
    var node_id = '';
    
    //hack default settings for options
    if (typeof args.node_id == 'undefined' ) { node_id = current_delimiter; } 
      else { node_id = args.node_id; };
    
    request
      .put('http://' + odl_ip + ':8181/restconf/operations/network-topology:network-topology' +
        '/topology/topology-netconf/node/' + node_id + '/yang-ext:mount/ios-cli:execute-and-read')

      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')

      .send('{ "input" : { "ios-cli:command" : "sh version"  }}')

      .end(function (err, res) {
        if (err || !res.ok) {
          self.log('CLI execution was unsuccessful. Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('CLI command was successfully executed on the device. Status code: ' + res.status);
        }       

        if (res.text) {
          self.log(JSON.stringify(JSON.parse(res.text), null, 2));
        }

      });
      callback();
  });

vorpal
  .command('delete nc-device <node_id>')
  .description('Deletes a netconf node in ODL. Requires node-id of the netconf device.')

  .action(function(args, callback) {
    var self = this;
    //var node_id = args.node_id;
    request
      .delete('http://' + odl_ip + ':8181/restconf/config/network-topology:network-topology/topology/topology-netconf/node/' + args.node_id)
      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')

      .end(function (err, res) {
        if (err || !res.ok) {
          self.log('Device was not found in the data store. Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Device was successfully deleted from the data store. Status code: ' + res.status);
        }

        if (res.text) {
          self.log(JSON.stringify(JSON.parse(res.text), null, 2));
        }

      });
      callback();
  });


vorpal
  .command('mount nc-device <node_id> <host> <port> <username> <password>')
  .option('-t, --tcp_only', 'tcp-only option')
  .option('-k, --keepalive_delay <keepalive-delay>', 'keepalive-delay')
  .description('Mounts a new netconf node in ODL. Requires node-id, port, ' + 
    'username and password of the netconf device, tcp-only and keepalive ' +
    'options can be set via options.')

  .action(function(args, callback) {
    var self = this;
    var tcp_only = false;
    var keepalive_delay = 0;
    
    //hack default settings for options
    if (typeof args.options.tcp_only == 'undefined' ) { tcp_only = false; } else { tcp_only = true; };
    if (typeof args.options.keepalive_delay == 'undefined' ) { keepalive_delay = 0 } 
      else { keepalive_delay = args.options.keepalive_delay; };

    request
      .put('http://' + odl_ip + ':8181/restconf/config/network-topology:network-topology/topology/topology-netconf/node/' + args.node_id)

      .auth(odl_user, odl_pass)
      .accept('application/xml')
      .set('Content-Type', 'application/xml')

      .send('<node xmlns="urn:TBD:params:xml:ns:yang:network-topology"><node-id>' + args.node_id + '</node-id>' +
        '<host xmlns="urn:opendaylight:netconf-node-topology">' + args.host + '</host>' + 
        '<port xmlns="urn:opendaylight:netconf-node-topology">' + args.port + '</port>' +
        '<username xmlns="urn:opendaylight:netconf-node-topology">' + args.username + '</username>' +
        '<password xmlns="urn:opendaylight:netconf-node-topology">' + args.password + '</password>' + 
        '<tcp-only xmlns="urn:opendaylight:netconf-node-topology">' + tcp_only+ '</tcp-only>' + 
        '<keepalive-delay xmlns="urn:opendaylight:netconf-node-topology">' + keepalive_delay + '</keepalive-delay></node>')

      .end(function (err, res) {
        if (err || !res.ok) {
          self.log('Mount attempt was unsuccessful. Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Device was successfully mmodified or overwritten in the data store. Status code: ' + res.status);
        }       

        if (res.status == 201) {
          self.log('Device was successfully created and mounted in the data store. Status code: ' + res.status);
        }

        if (res.text) {
          self.log(JSON.stringify(JSON.parse(res.text), null, 2));
        }

      });
      callback();
  });


vorpal
  .command('show nc-device <node_id>')
  .description('Displays information about a netconf node in ODL. Requires node-id.')

  .action(function(args, callback) {
    var self = this;
    var node_id = args.node_id;
    request
      .get('http://' + odl_ip + ':8181/restconf/config/network-topology:network-topology/topology/topology-netconf/node/' + args.node_id)

      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')

      .end(function (err, res) {

        if (err || !res.ok) {
          self.log('Device was not found in data store. Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Device was found in data store. Status code: ' + res.status);
        }

        self.log(JSON.stringify(JSON.parse(res.text), null, 2));

      });
      callback();
  });


vorpal
  .command('show operational yang-ext <node_name>')
  .description('Displays ODL topology information.')

  .action(function(args, callback) {
    var self = this;
    request
      .get('http://' + odl_ip + ':8181/restconf/operational/' + 
        'network-topology:network-topology/topology/topology-netconf/' + 
        'node/' + args.node_name + '/yang-ext:mount')

      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')

      .end(function (err, res) {

        if (err || !res.ok) {
          self.log('Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Status code: ' + res.status);
        }

        self.log(JSON.stringify(JSON.parse(res.text), null, 2));

      });
      callback();
  });

vorpal
  .command('show topologies')
  .description('Displays ODL topology information.')

  .action(function(args, callback) {

  var self = this;
  
    request
      .get('http://' + odl_ip + ':8181/restconf/operational/network-topology:network-topology')

      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')

      .end(function (err, res) {

        if (err || !res.ok) {
          self.log('Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Status code: ' + res.status);
        }

        self.log(JSON.stringify(JSON.parse(res.text), null, 2));

      });
      callback();
  });


vorpal
  .command('show yang models', 'Retrieve all YANG models in connected ODL node')
  .option('-p, --prettyprint', 'Prettyprints json text.')

  .action(function(args, callback) {
    var self = this;
    request
      .get('http://' + odl_ip + ':8181/restconf/modules')

      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')
      .end(function (err, res) {

        if (err || !res.ok) {
          self.log('Mount attempt was unsuccessful. Error code: ' + err.status);
        } 

        if (res.status == 200) {
          self.log('Device was successfully mmodified or overwritten in the data store. Status code: ' + res.status);
        }       

        if (res.status == 201) {
          self.log('Device was successfully created and mounted in the data store. Status code: ' + res.status);
        }

        if (res.text) {
          self.log(JSON.stringify(JSON.parse(res.text), null, 2));
        }

      });
      callback();
  });



vorpal
  .command('test odl connectivity', 'Tests connectivity to host and port 8181. \
  You need to be logged on to an ODL node for the test to succeed. Also see \
  command "logon"')

  .action(function(args, callback) {
    var self = this;
    request
      .get('http://' + odl_ip + ':8181/restconf/modules')
      .auth(odl_user, odl_pass)
      .accept('application/json')
      .set('Content-Type', 'application/json')
      .end(function (err, res) {
         if (err || !res.ok) {
               self.log('Can not connect to host or port');
             } else {
               self.log('We have connectivity!');
             }
      });
    callback();
  });


vorpal
  .command('logon <node_name>')
  .description('Connects to an ODL node.')
  .alias('log')
  .action(function(args, callback) {
      var self = this;
      this.log('Connecting to ' + args.node_name);
      current_delimiter = args.node_name;
      odl_ip = args.node_name;
      this.delimiter('<' + current_delimiter + '>$');
      this.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Username: '
        },
        {
          type: 'password',
          name: 'password',
          message: 'Password: '
        }
        ], function (answers) {
          if (answers.username) {
            odl_user = answers.username;
            odl_pass = answers.password;
          }
        callback();
      });
  });

vorpal
  .command('logoff')
  .description('Discconnects from an ODL node.')
  .alias('logo')
  .action(function(args, callback) {
    odl_ip = '';
    odl_user = '';
    odl_pass = '';
    current_delimiter = 'frinxit';
    vorpal.delimiter('frinxit$').show();
    callback();
  });



// remove the built-in vorpal exit command so we can define it for our 
// purposes. When in a context leave that context, when at the top level
// close the application
const exit = vorpal.find('exit');
  if (exit) { 
    exit
    .remove();
  }

vorpal
  .command('exit')
	.alias('quit')
	.description('Exits current mode or application.')
	.action(function (args, callback) {

      if (current_delimiter == 'frinxit'){
        args.options = args.options || {};
        args.options.sessionId = this.session.id;
        this.parent.exit(args.options);
      }
      else {
        current_delimiter = 'frinxit';
        vorpal.delimiter('frinxit$').show();
        callback();
        }
	});



//  restconf/config/ietf-l3vpn-svc:l3vpn-svc/vpn-services/vpn-service/T24T_vpn1



