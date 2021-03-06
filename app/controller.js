var fs = require('fs');
var path = require('path');
var util = require('util');
var byline = require('byline');

var votesFilePath = path.join(__dirname, 'votes.txt');

exports.login = function (req, res) {
    
    if (req.body.username == null || req.body.username == '') {
        res.setHeader('WWW-Authenticate', 'realm="My realm"');
        res.render('login');
    } else {
        req.session.username = req.body.username;
        
        res.redirect('/vote');
    }
};

exports.vote = function (req, res) {
    
    saveVote(req);
    
    res.redirect('/results');
};

exports.voteSafe = function (req, res) {
    
    if (isCrsfTokenPresent(req) && isCrsfTokenValid(req)) {
        saveVote(req);
    }
    
    res.redirect('/results');
};

exports.clearVotes = function (req, res) {

	fs.truncate(votesFilePath, 0, function () {
		res.send("Votes cleared.");
	});
};

exports.results = function (req, res) {
    var stream = fs.createReadStream(votesFilePath);
    stream = byline.createStream(stream);
    
    var counts = {
        'SF': 0,
        'SEA': 0
    };
    var votes = [];
    
    stream.on('data', function (line) {
        var fields = line.toString().split('\t');
        
        var vote = {
            date: fields[0],
            username: fields[1],
            vote: fields[2]
        };
        votes.push(vote);
        
        counts[vote.vote]++;
    });
    
    stream.on('end', function () {
        var viewModel = {
            votes: votes,
            counts: counts
        };
    
        res.render('results', viewModel);
    });
};

exports.voteSearch = function (req, res) {
    
    searchVotes(req, res, 'vote-search');
};

exports.voteSearchSafe = function (req, res) {

    searchVotes(req, res, 'vote-search-safe');
};

var saveVote = function (req) {
    
    var now = new Date();
    var date = util.format('%d/%d/%d %d:%d:%d', now.getMonth() + 1, 
        now.getDate(), now.getFullYear(), now.getHours(), now.getMinutes(), 
        now.getSeconds());
    var text = util.format('%s\t%s\t%s\n', date, req.session.username, 
        req.body.vote);
    
    fs.appendFile(votesFilePath, text);
};

var isCrsfTokenPresent = function (req) {
    
    return (req.body.csrfToken != null && req.body.csrfToken != null);
};

var isCrsfTokenValid = function (req) {
    
    return (req.body.csrfToken == req.cookies.csrfToken);
};

var searchVotes = function(req, res, viewName) {
        
    var username = req.query.username || '';
    var viewModel = {
        username: username
    };
    
    if (username != '') {

        var stream = fs.createReadStream(votesFilePath);
        stream = byline.createStream(stream);

        var votes = [];
    
        stream.on('data', function (line) {
            var fields = line.toString().split('\t');
        
            if (username.toLowerCase() == fields[1].toLowerCase()) {
                var vote = {
                    date: fields[0],
                    username: fields[1],
                    vote: fields[2]
                };
                votes.push(vote);
            }
        });

        stream.on('end', function () {
            viewModel.votes = votes;
    
            res.render(viewName, viewModel);
        });
    } else {
        res.render(viewName, viewModel);
    }
};