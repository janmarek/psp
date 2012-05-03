package cz.ctu.fit.w20.team1013;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.DB;
import com.mongodb.DBCollection;
import com.mongodb.DBCursor;
import com.mongodb.DBObject;
import com.mongodb.Mongo;

public class MongoDatabase {
	
	public static final int MAX_COUNT_POSLANCI = 20;
	public static final int MAX_COUNT_HLASOVANI = 1;
	
	private Mongo m;
	private DB db;

	public void connect() throws Exception {
		m = new Mongo("localhost" , 27017);
		db = m.getDB("psp");
	}
	
	public Mongo getM() {
		return m;
	}

	public DB getDb() {
		return db;
	}

	public void disconnect() {
		m.close();
	}
	
	public Map<Integer, String[]> getPoslanci() {
		
		DBCollection coll = db.getCollection("dataPoslanci");
		Map<Integer, String[]>  result = new HashMap<Integer, String[]> ();
		DBObject object = coll.findOne();
		
		Map<String, Integer> count = new HashMap<String, Integer> ();
		
		BasicDBList poslanci = (BasicDBList)object.get("poslanci");
		for (Object poslanec : poslanci) {
			BasicDBObject poslanecDb = (BasicDBObject) poslanec;
			String strana = poslanecDb.getString("strana");
			int i = 0;
			if (count.containsKey(strana)) {
				i = count.get(strana);
			}
			if (i < MAX_COUNT_POSLANCI) {
				count.put(strana, ++i);
				String jmeno = poslanecDb.getString("jmeno");
				int id = Integer.parseInt(poslanecDb.getString("id"));
				result.put(id, new String[] {jmeno, strana});
			}
		}
		return result;
	}
	
	public Map<Date, List<Integer[]>> getSnapshots() {
		
		DBCollection coll = db.getCollection("snapshots");
		Map<Date, List<Integer[]>> result = new HashMap<Date, List<Integer[]>> ();
        DBCursor cur = coll.find();

        while(cur.hasNext()) {
            DBObject snapshot = cur.next();
            Date create = new Date(Math.round((Double)snapshot.get("created")));
            BasicDBList schuze = (BasicDBList)snapshot.get("schuze");
            List<Integer[]> schuzeList = new ArrayList<Integer[]>();
            for (Object schuzeObj : schuze) {
            	BasicDBObject schuzeDb = (BasicDBObject) schuzeObj;
            	schuzeList.add(new Integer[]{
            			Integer.parseInt(schuzeDb.getString("id")),
            			Integer.parseInt(schuzeDb.getString("obdobi"))
            	});
            }
            
            result.put(create, schuzeList);
        }
        
        cur.close();
		
		return result;
	}
	
	public Map<Date, List<Object[]>> getHlasovaniBySnapshot() {
		
		DBCollection coll = db.getCollection("dataSchuze");
		Map<Date, List<Object[]>>  result = new HashMap<Date, List<Object[]>> ();
		
		Map<Date, List<Integer[]>> snapshots = getSnapshots();
		
		for (Entry<Date, List<Integer[]>> entry : snapshots.entrySet()) {
			List<Object[]> hlasovaniRes = new ArrayList<Object[]>();
			List<Integer[]> schuze = entry.getValue();
			for (Integer[] schuzeId : schuze) {
				BasicDBObject query = new BasicDBObject();
		        query.put("id", String.valueOf(schuzeId[0]));
		        query.put("obdobi", String.valueOf(schuzeId[1]));
		        DBCursor cur = coll.find(query);
		        if (cur.hasNext()) {
		        	DBObject schuzeDB = cur.next();
		        	BasicDBList hlasovaniList = (BasicDBList)schuzeDB.get("hlasovani");
		        	int i = 1;
		        	for (Object hlasovaniObj : hlasovaniList) {
		        		if (i > MAX_COUNT_HLASOVANI) {
		        			break;
		        		}
		        		i++;
		        		hlasovaniRes.add(new Object[] {schuzeId[0], schuzeId[1], (DBObject)hlasovaniObj});
		        	}
		        	
		        }
		        cur.close();
			}
			result.put(entry.getKey(), hlasovaniRes);
		}
		
		return result;
	}

}
