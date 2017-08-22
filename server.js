'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');
var players = [];
var que = [];
var games = [];
var thisgame;
const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);
setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

io.on('connection', function(socket){
	console.log("Player Connected!");
	socket.emit('socketID', { id: socket.id });

	socket.on('QUE', function(data){
    	    data.id = socket.id;
    	    //socket.broadcast.emit('playerMoved',data);

    	    for(var i = 0;i<players.length;i++){
    	        if(players[i].id==data.id){
                    players[i].name = data.name;
    	            que.push(new queItem(players[i].id));

    	            socket.emit("QUED",{ name: players[i].name});
    	            console.log("Player Qued: "+players[i].name +" "+players[i].id);
    	        }
    	    }

    	    if(que.length>=2){
    	        for(var i = 0;i<players.length;i++){
    	            if(players[i].id==que[0].id){
    	                 var p1 = players[i];
    	            }
    	            if(players[i].id==que[1].id){
                         var p2 = players[i];
                    }
    	        }

                thisgame = new game(data.id,p1,p2);
                io.to(thisgame.gameplayers[0].id).emit("newGame",thisgame);
                io.to(thisgame.gameplayers[1].id).emit("newGame",thisgame);
                games.push(thisgame);
                que.splice(0, 2)
              console.log("game created");
             }

    	});
    socket.on('Ready', function(data){
        	    data.id = socket.id;

        	    for(var i = 0;i<games.length;i++){
        	        if(games[i].id==data.sessionID){

        	            games[i].playersReady++;
        	            if(games[i].playersReady==games[i].gameplayers.length){
        	                io.to(games[i].gameplayers[0].id).emit("GO",{ id: socket.id });
                            io.to(games[i].gameplayers[1].id).emit("GO",{ id: socket.id });
        	            }

        	        }
        	    }
        	});
    socket.on('playerMoved', function(data){
        	    data.id = socket.id;
        	   // socket.broadcast.emit('playerMoved',data);
                for(var j = 0;j<games.length;j++){
                    if(games[j].id==data.SessionID){
                         for(var i = 0;i<games[j].gameplayers.length;i++){
                             if(games[j].gameplayers[i].id==data.playerID){
                                  games[j].gameplayers[i].x = data.x;
                                  games[j].gameplayers[i].y = data.y;
                                 // console.log("player " + i+" x: "+games[j].gameplayers[i].x);
                                //  console.log("player " + i+" y: "+games[j].gameplayers[i].y);
                              }else{
                                    io.to(games[j].gameplayers[i].id).emit("playerMoved",data);
                              }

                          }
                    }

                }

        	});
    socket.on('GameFinished', function(data){
                	    data.id = socket.id;


                	    for(var i = 0;i<games.length;i++){
                             if(games[i].id==data.SessionID){
                                    console.log("Session Found");
                                  games[i].playersFinished++;

                                  for(var j = 0;j<games[i].gameplayers.length;j++){

                                        if(games[i].gameplayers[j].id==data.PlayerID){

                                            games[i].gameplayers[j].time=data.Time;
                                            console.log("player finished");
                                        }

                                  }



                                  if(games[i].playersFinished==games[i].gameplayers.length){

                                        if(games[i].gameplayers[0].time<games[i].gameplayers[1].time){

                                            var o = new Object();
                                            o.name = games[i].gameplayers[0].name;
                                            o.time = games[i].gameplayers[0].time;
                                            io.to(games[i].gameplayers[0].id).emit("GameWinner",o);
                                            io.to(games[i].gameplayers[1].id).emit("GameWinner",o);
                                            console.log("Winner "+games[i].gameplayers[0].name + " time "+ games[i].gameplayers[0].time);
                                            console.log("Loser "+games[i].gameplayers[1].name + " time "+ games[i].gameplayers[1].time);
                                        }else{
                                             var o = new Object();
                                             o.name = games[i].gameplayers[1].name;
                                             o.time = games[i].gameplayers[1].time;
                                             io.to(games[i].gameplayers[0].id).emit("GameWinner",o);
                                             io.to(games[i].gameplayers[1].id).emit("GameWinner",o);
                                             console.log("Loser "+games[i].gameplayers[0].name + " time "+ games[i].gameplayers[0].time);
                                             console.log("Winner "+games[i].gameplayers[1].name + " time "+ games[i].gameplayers[1].time);
                                        }
                                            console.log("Game Finished");
                                   }

                             }
                         }

                	});
    socket.on('leaveQUE', function(data){
     console.log(data.name+" is trying to leave QUE");
     console.log("Socket ID: "+socket.id);
     for(var i = 0; i<que.length;i++){
      console.log("QUE "+i +" : "+que[i].id);
         if(que[i].id==socket.id){
            que.splice(i,1);
            console.log("player "+data.name+" left que");
         }

      }
    });
    socket.on('disconnect', function(){
                    		console.log("Player Disconnected");
                    		socket.broadcast.emit('playerDisconnected', { id: socket.id });
                    		for(var i = 0; i < players.length; i++){
                    			if(players[i].id == socket.id){
                    				players.splice(i, 1);
                    				//players.splice(0,1);
                    			}
                    		}
                    		for(var i = 0; i<que.length;i++){
                    		    if(que[i].id==socket.id){
                    		        que.splice(i,1);
                    		    }
                    		}
                    	});

	players.push(new player(socket.id, 0, 0));
});
//updateBullets
function player(id, x, y){
	this.id = id;
	this.x = x;
	this.y = y;
	this.name = "pelle";
	this.Bulletprop;
	this.time=0;
	console.log(this);
}
function game(id,player1,player2){
   this.id = id
   this.started = false;
   this.ended = false;
   this.gameplayers =[];
   this.gameplayers.push(player1);
   this.gameplayers.push(player2);
   this.playersReady = 0;
   this.playersFinished = 0;

}

function queItem(id){
this.id = id
}


