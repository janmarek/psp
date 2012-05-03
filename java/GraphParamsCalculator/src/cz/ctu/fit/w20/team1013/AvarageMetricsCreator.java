package cz.ctu.fit.w20.team1013;

import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.gephi.data.attributes.api.AttributeColumn;
import org.gephi.data.attributes.api.AttributeController;
import org.gephi.data.attributes.api.AttributeModel;
import org.gephi.data.attributes.api.AttributeOrigin;
import org.gephi.data.attributes.api.AttributeTable;
import org.gephi.data.attributes.api.AttributeType;
import org.gephi.data.attributes.type.TimeInterval;
import org.gephi.dynamic.api.DynamicController;
import org.gephi.dynamic.api.DynamicModel;
import org.gephi.graph.api.Edge;
import org.gephi.graph.api.GraphController;
import org.gephi.graph.api.GraphModel;
import org.gephi.graph.api.Node;
import org.gephi.graph.api.UndirectedGraph;
import org.gephi.project.api.ProjectController;
import org.gephi.statistics.plugin.GraphDensity;
import org.openide.util.Lookup;

import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.DB;
import com.mongodb.DBObject;

import cz.cvut.fit.gephi.snametrics.clusteringcoefficient.ClusteringMetric;
import cz.cvut.fit.gephi.snametrics.erdosnumber.ErdosNumberMetric;
import cz.cvut.fit.gephi.snametrics.overlap.OverlapMetric;


public class AvarageMetricsCreator {
	
	private final MongoDatabase mongoDatabase;

	public AvarageMetricsCreator(MongoDatabase mongoDatabase) {
		super();
		this.mongoDatabase = mongoDatabase;
	}
	
	public void generateMetrics(Map<Integer, String[]> poslanci, Map<Date, List<Object[]>> hlasovani) throws Exception {
		
        List<Date> sortedDates = new ArrayList<Date>(hlasovani.keySet());
        Collections.sort(sortedDates);
        for (int i = 0; i < sortedDates.size(); i++) {
        	Date startDate = sortedDates.get(i);
        	long startDateLong = startDate.getTime();
        	
        	//Init a project - and therefore a workspace
            ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
            pc.newProject();
            pc.getCurrentWorkspace();

            //Get a graph model - it exists because we have a workspace
            GraphModel graphModel = Lookup.getDefault().lookup(GraphController.class).getModel();
            UndirectedGraph graph = graphModel.getUndirectedGraph();
            
            AttributeModel attributeModel = Lookup.getDefault().lookup(AttributeController.class).getModel();
            AttributeColumn stranaColumn = attributeModel.getNodeTable().addColumn("strana", AttributeType.STRING);
            int stranaColumnIndex = stranaColumn.getIndex();
            AttributeColumn idSchuzeColumn = attributeModel.getEdgeTable().addColumn("idSchuze", AttributeType.INT);
            int idSchuzeColumnIndex = idSchuzeColumn.getIndex();
            AttributeColumn obdobiColumn = attributeModel.getEdgeTable().addColumn("obdobi", AttributeType.INT);
            int obdobiColumnIndex = obdobiColumn.getIndex();
            AttributeColumn cisloHlasovaniColumn = attributeModel.getEdgeTable().addColumn("cisloHlasovani", AttributeType.INT);
            int cisloHlasovaniColumnIndex = cisloHlasovaniColumn.getIndex();
            AttributeColumn temaHlasovaniColumn = attributeModel.getEdgeTable().addColumn("temaHlasovani", AttributeType.STRING);
            int temaHlasovaniColumnIndex = temaHlasovaniColumn.getIndex();
            
            AttributeTable table = attributeModel.getEdgeTable();
            AttributeColumn timeIntervalColumn = getTimeIntervalColumn(table);
            int timeIntervalColumnIndex = timeIntervalColumn.getIndex();
            
            
            Map<Integer, Node> poslanciNodes = new HashMap<Integer, Node>();
            
            Node centerOfTheUniverse = null;
            for (Entry<Integer, String[]> poslanec : poslanci.entrySet()) {
            	Node node = graphModel.factory().newNode(String.valueOf(poslanec.getKey()));
            	node.getNodeData().setLabel(poslanec.getValue()[0]);
            	MessageDigest md = MessageDigest.getInstance("SHA-1");
                byte[] sha1hash = new byte[40];
                md.update(poslanec.getValue()[1].getBytes("UTF-8"), 0, poslanec.getValue()[1].length());
                sha1hash = md.digest();
            	node.getNodeData().setColor(Float.intBitsToFloat(sha1hash[0]), Float.intBitsToFloat(sha1hash[1]), Float.intBitsToFloat(sha1hash[2]));
            	node.getAttributes().setValue(stranaColumnIndex, poslanec.getValue()[1]);
            	graph.addNode(node);
            	poslanciNodes.put(poslanec.getKey(), node);
            	centerOfTheUniverse = node; 
            	
            }
        	
        	
        	TimeInterval timeInterval = new TimeInterval(startDate.getTime(), Double.POSITIVE_INFINITY);
        	List<Object[]> hlasovaniList = hlasovani.get(startDate);
        	for (Object[] hlasovaniObj : hlasovaniList) {
        		int idSchuze = (Integer)hlasovaniObj[0];
        		int obdobi = (Integer)hlasovaniObj[1];
        		DBObject hlasovaniDb = (DBObject)hlasovaniObj[2];
        		int cisloHlasovani = Integer.parseInt((String)hlasovaniDb.get("number"));
        		String temaHlasovani = (String)hlasovaniDb.get("title");
        		BasicDBList hlasyList = (BasicDBList)hlasovaniDb.get("hlasy");
        		List<Integer> deputyList = new ArrayList<Integer>(); 
        		for (Object hlasObj : hlasyList) {
        			BasicDBObject hlasDb = (BasicDBObject) hlasObj;
        			String akce = hlasDb.getString("akce");
        			// edge between deputies if both accepted new law
        			if ("A".equals(akce)) {
        				Integer poslanecId = Integer.parseInt(hlasDb.getString("poslanecId"));
        				if (poslanciNodes.containsKey(poslanecId)) {
        					deputyList.add(poslanecId);
        				}
        			}
        		}
        		
        		for (int d1 : deputyList) {
        			Node nd1 = poslanciNodes.get(d1);
        			for (int d2 : deputyList) {
        				if (d1 != d2) {
        					Edge edge = graphModel.factory().newEdge(
        							startDateLong + "_" + idSchuze + "_" + obdobi
        							 + "_" + cisloHlasovani , nd1, poslanciNodes.get(d2), 1, false);
        					
        					edge.getAttributes().setValue(idSchuzeColumnIndex, idSchuze);
        					edge.getAttributes().setValue(obdobiColumnIndex, obdobi);
        					edge.getAttributes().setValue(cisloHlasovaniColumnIndex, cisloHlasovani);
        					edge.getAttributes().setValue(temaHlasovaniColumnIndex, temaHlasovani);
        					edge.getAttributes().setValue(timeIntervalColumnIndex, timeInterval);
        		        	graph.addEdge(edge);
        				}
        			}
        		}
        	}
        	Lookup.getDefault().lookup(DynamicController.class).setTimeFormat(DynamicModel.TimeFormat.DATE);  
        	createAndSaveAvarageMetrics(startDate, graphModel, attributeModel, centerOfTheUniverse);
        	pc.closeCurrentWorkspace();
        	pc.closeCurrentProject();
        }
        
        
        

	}
	
	private void createAndSaveAvarageMetrics(Date snapshotDate, GraphModel graphModel, AttributeModel attributeModel, Node centerOfTheUniverse) {
		
		DB db = mongoDatabase.getDb();

//      metric
//      name erdos
//      value erdosNumber
        ErdosNumberMetric erdosNumberMetric = new ErdosNumberMetric();
        erdosNumberMetric.setSourceNode(centerOfTheUniverse);
        erdosNumberMetric.execute(graphModel, attributeModel);
        double erdosNumber = erdosNumberMetric.getErdosAverage();
        System.out.println("erdosNumber " + erdosNumber);

//      metric
//      name clustering
//      value clusteringCoefficient
        ClusteringMetric clusteringMetric = new ClusteringMetric();
        clusteringMetric.execute(graphModel, attributeModel);
        double clusteringCoefficient = clusteringMetric.getAverageCoefficient();
        System.out.println("clusteringCoefficient " + clusteringCoefficient);
        
//      metric
//      name overlap
//      value overlap
        OverlapMetric overlapMetric = new OverlapMetric();
        overlapMetric.execute(graphModel, attributeModel);
        double overlap = overlapMetric.getAverageOverlap();
        System.out.println("overlap " + overlap);

//      metric
//      name embeddedness
//      value embeddedness
        double embeddedness = overlapMetric.getAverageEmbeddedness();
        System.out.println("embeddedness " + embeddedness);

//      metric
//      name density
//      value density
        GraphDensity graphDensity = new GraphDensity();
        graphDensity.execute(graphModel, attributeModel);
        double density = graphDensity.getDensity();
        System.out.println("density " + density);
        
	}
	
	private AttributeColumn getTimeIntervalColumn(AttributeTable table) {
        AttributeColumn column = table.getColumn(DynamicModel.TIMEINTERVAL_COLUMN);
        if (column == null) {
            column = table.addColumn(DynamicModel.TIMEINTERVAL_COLUMN, "Time Interval", AttributeType.TIME_INTERVAL, AttributeOrigin.PROPERTY, null);
        }
        return column;
    }

}
