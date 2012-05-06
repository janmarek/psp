// imports
var Parsing = require('./parsing'),
	dbAccess = null, parsing = null, model = null;

// constructor
function DataHandler(iDbAccess, iModel) {
	dbAccess = iDbAccess;
	parsing = new Parsing();
	model = iModel;
}

DataHandler.prototype = {
	/**
	 * If there are some new data, creates new snapshot.
	 */
	createSnapshot: function(createDate) {
		console.log('Checking changes and making new snapshot');
		parsing.getSeznamSchuzi(null, function(schuzeNew) {

			dbAccess.getDb().collection('snapshots', function(err, snapshotsCollection) {
				snapshotsCollection.find().toArray(function(err, items) {
					// get previously created data info
					var schuzeStored = [];
					var edges = 0;
					var nodes = 0;
		        	if (items != null) {
		        		for(var i in items) {
		        			if (items[i].schuze != null) {
		        				for(var j in items[i].schuze) {
		        					schuzeStored.push({obdobi: items[i].schuze[j].obdobi, id: items[i].schuze[j].id});
		        				}
		        			}
		        		}
		        	}

		        	var createdMettingsCount = 0;
		        	// fetch and store only new data
		        	for(var i in schuzeNew.schuze) {
		        		var newOne = schuzeNew.schuze[i];
		        		var found = false;
		        		for(var j in schuzeStored) {
		        			if (newOne.title == schuzeStored[j].id && schuzeNew.obdobi == schuzeStored[j].obdobi) {
		        				found = true;
		        				break;
		        			}
		        		}
		        		if (!found) {
		        			createdMettingsCount++;
		        			dbAccess.getDb().collection('snapshots', function(err, snapshotsCollection) {
		        				var snapDoc = {id:newOne.title, obdobi:schuzeNew.obdobi};
		        				snapshotsCollection.update({created:createDate}, {$set:{node:nodes, edge:edges}, $addToSet:{schuze:snapDoc}}, {upsert:true, safe:true}, function(err, resultN) {});
				    	    });
		        			// new government meeting - create snapshot
		        			dbAccess.getDb().collection('dataSchuze', function(err, dataCollection) {
								var doc = {id:newOne.title, obdobi:schuzeNew.obdobi, hlasovani:[]};
								console.log('New government meeting ' + doc.id);
								dataCollection.insert(doc, {safe:true}, function(err, result) {
									//console.log(result);
									var obdobi = result[0].obdobi;
									var id = result[0].id;
									// parse list of divisions in meeting
									parsing.getSeznamHlasovani(obdobi, id, function(seznamHlasovani) {
										console.log('list of divisions in meeting ' + id);
										seznamHlasovani = seznamHlasovani.filter(function(h) {return h.title.indexOf('Procedurální hlasování') === -1});
										var seznamHlasovaniFiltered = seznamHlasovani.filter(function(h) {return h.title.indexOf('Vl.n.z.') !== -1}); // brat jenom hlasovani o zakonech navrzenych vladou nebo prvnich 10
										if (seznamHlasovaniFiltered.length === 0) {
											seznamHlasovaniFiltered = seznamHlasovani.slice(0, 10);
										}
										console.log(seznamHlasovaniFiltered);
										seznamHlasovaniFiltered
											.forEach(function(hlasovani) {
												console.log('hlasovani '+hlasovani.title);
											// get votes
											parsing.getHlasovani(hlasovani.url, function(hlasy) {
												var seznamHlasovaniObj = {number:hlasovani.number, title:hlasovani.title};
												// save division
												console.log('Division error ' + hlasy.error + ' url ' + hlasy.url);
//												console.log(hlasy);
												if (!hlasy.error) {
													var hlasyArray = [];
													dbAccess.getDb().collection('dataPoslanci', function(err, poslanciCollection) {
														for(var k in hlasy.hlasy) {
															var vote = {akce:hlasy.hlasy[k].akce, poslanecId:hlasy.hlasy[k].poslanec.id};
															hlasyArray.push(vote);
//															console.log('New vote ' + vote.akce + ' ' + vote.poslanecId + ' ' + seznamHlasovaniObj.number);
															// vote is edge
															edges++;

															// insert new deputy
															var doc2 = {id:hlasy.hlasy[k].poslanec.id, jmeno:hlasy.hlasy[k].poslanec.jmeno,
																	strana:hlasy.hlasy[k].poslanec.strana};
//															console.log('New deputy');
//															console.log(doc2);
															poslanciCollection.update({obdobi:newOne.title}, {$addToSet:{poslanci:doc2}}, {upsert:true, safe:true}, function(err, resultN) {
																// deputy is node
																//nodes++;
															});
															dbAccess.getDb().collection('snapshots', function(err, snapshotsCollection) {
																snapshotsCollection.update({created:createDate}, {$set:{node:nodes, edge:edges}}, {upsert:true, safe:true}, function(err, resultN) {});
												    	    });
														}
													});
													var doc1 = {number:seznamHlasovaniObj.number, title:seznamHlasovaniObj.title,
															prijato:hlasy.prijato, pritomno:hlasy.pritomno, jetreba:hlasy.jetreba,
															ano:hlasy.ano, ne:hlasy.ne, hlasy:hlasyArray};
													dataCollection.update({id:id, obdobi:obdobi}, {$push:{hlasovani:doc1}}, {upsert:true, safe:true}, function(err, resultN) {
														console.log('New division');
														//console.log(doc1);
														// division is node
														nodes++;
														dbAccess.getDb().collection('snapshots', function(err, snapshotsCollection) {
															snapshotsCollection.update({created:hlasy.date.getTime()}, {$set:{node:nodes, edge:edges}}, {upsert:true, safe:true}, function(err, resultN) {});
											    	    });
													});
												}
								            });
										});
									});
									// government meeting is node
									nodes++;
								});
	        			    });
		        			dbAccess.getDb().collection('appData', function(err, appDataCollection) {
				        		appDataCollection.update({name:'lastUpdate'}, {$set:{value:createDate}}, {safe:true}, function(err, resultN) {});
				    	    });
		        			dbAccess.getDb().collection('snapshots', function(err, snapshotsCollection) {
		        				snapshotsCollection.update({created:createDate}, {$set:{node:nodes, edge:edges}}, {upsert:true, safe:true}, function(err, resultN) {});
				    	    });
		        		}
		        		// fetch maximal model.maxMeetingsInSnapshot() meetings in one snapshot - due to data size and connection save
		        		if (createdMettingsCount >= model.maxMeetingsInSnapshot()) {
		        			console.log('Loaded maximum count of meetings. End of snapshot creation');
		        			break;
		        		}
		        	}

		        });
		    });

        });
	}
};

module.exports = DataHandler;