package cz.ctu.fit.w20.team1013;

import java.io.File;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.Map.Entry;

import org.gephi.data.attributes.api.AttributeColumn;
import org.gephi.data.attributes.api.AttributeController;
import org.gephi.data.attributes.api.AttributeModel;
import org.gephi.data.attributes.api.AttributeOrigin;
import org.gephi.data.attributes.api.AttributeTable;
import org.gephi.data.attributes.api.AttributeType;
import org.gephi.data.attributes.type.TimeInterval;
import org.gephi.dynamic.api.DynamicController;
import org.gephi.dynamic.api.DynamicGraph;
import org.gephi.dynamic.api.DynamicModel;
import org.gephi.graph.api.Edge;
import org.gephi.graph.api.GraphController;
import org.gephi.graph.api.GraphModel;
import org.gephi.graph.api.Node;
import org.gephi.graph.api.UndirectedGraph;
import org.gephi.io.exporter.api.ExportController;
import org.gephi.project.api.ProjectController;
import org.gephi.project.api.Workspace;
import org.openide.util.Lookup;

import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;


public class GexfBaseCreator {
	
	private static final String FILE_PATH = "../../tmp/cachev2.gexf";

	public GexfBaseCreator() {
		super();
	}
	
	public void generateGexf(Map<Integer, String[]> poslanci, Map<Date, List<Object[]>> hlasovani) throws Exception {
		//Init a project - and therefore a workspace
        ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
        pc.newProject();
        Workspace workspace = pc.getCurrentWorkspace();

        //Get a graph model - it exists because we have a workspace
        GraphModel graphModel = Lookup.getDefault().lookup(GraphController.class).getModel();
        UndirectedGraph graph = graphModel.getUndirectedGraph();
        Lookup.getDefault().lookup(DynamicController.class).setTimeFormat(DynamicModel.TimeFormat.DATE);  
        
        DynamicModel dynamicModel = Lookup.getDefault().lookup(DynamicController.class).getModel();
        DynamicGraph dynamicGraph = dynamicModel.createDynamicGraph(graph);
        
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
//        AttributeTable tableNode = attributeModel.getNodeTable();
//        AttributeColumn timeIntervalColumnNode = getTimeIntervalColumn(tableNode);
//        int timeIntervalColumnNodeIndex = timeIntervalColumnNode.getIndex();
        
        Map<Integer, Node> poslanciNodes = new HashMap<Integer, Node>();
        List<Date> sortedDates = new ArrayList<Date>(hlasovani.keySet());
        Collections.sort(sortedDates);
//        Date firstDate = sortedDates.get(0);
//        TimeInterval timeIntervalNode = new TimeInterval(firstDate.getTime(), Double.POSITIVE_INFINITY);
        
        for (Entry<Integer, String[]> poslanec : poslanci.entrySet()) {
        	Node node = graphModel.factory().newNode(String.valueOf(poslanec.getKey()));
        	node.getNodeData().setLabel(poslanec.getValue()[0]);
        	MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] sha1hash = new byte[40];
            md.update(poslanec.getValue()[1].getBytes("UTF-8"), 0, poslanec.getValue()[1].length());
            sha1hash = md.digest();
            float color[] = ColorHelper.get(poslanec.getValue()[1]);
            node.getNodeData().setColor(color[0], color[1], color[2]);
        	//node.getNodeData().setColor(Float.intBitsToFloat(sha1hash[0]), Float.intBitsToFloat(sha1hash[1]), Float.intBitsToFloat(sha1hash[2]));
        	node.getAttributes().setValue(stranaColumnIndex, poslanec.getValue()[1]);
//        	node.getAttributes().setValue(timeIntervalColumnNodeIndex, timeIntervalNode);
        	graph.addNode(node);
        	poslanciNodes.put(poslanec.getKey(), node);
        	
        }
        
        int count = 0;
        for (int i = 0; i < sortedDates.size(); i++) {
        	Date startDate = sortedDates.get(i);
        	long startDateLong = startDate.getTime();
        	Date endDate = null;
        	if (i + 1 < sortedDates.size()) {
        		endDate = sortedDates.get(i + 1);
        	}
        	System.out.println("startDate " + startDate + " endDate " + endDate);
        	TimeInterval timeInterval = new TimeInterval(startDateLong, Double.POSITIVE_INFINITY);
        	List<Object[]> hlasovaniList = hlasovani.get(startDate);
        	for (Object[] hlasovaniObj : hlasovaniList) {
        		int idSchuze = (Integer)hlasovaniObj[0];
        		int obdobi = (Integer)hlasovaniObj[1];
        		DBObject hlasovaniDb = (DBObject)hlasovaniObj[2];
        		int cisloHlasovani = Integer.parseInt((String)hlasovaniDb.get("number"));
        		String temaHlasovani = (String)hlasovaniDb.get("title");
        		BasicDBList hlasyList = (BasicDBList)hlasovaniDb.get("hlasy");
        		System.out.println("idSchuze " + idSchuze + " obdobi " + obdobi + " cisloHlasovani " + cisloHlasovani + " temaHlasovani " + temaHlasovani);
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
        		
        		
        		int k = 0, l = 0, m = 0;
        		for (int d1 : deputyList) {
        			Node nd1 = poslanciNodes.get(d1);
        			for (int d2 : deputyList) {
        				if (d1 != d2) {
        					Edge edge = graphModel.factory().newEdge(String.valueOf(++count) + "cnt", nd1, poslanciNodes.get(d2), 1, false);
        					
        					edge.getAttributes().setValue(idSchuzeColumnIndex, idSchuze);
        					edge.getAttributes().setValue(obdobiColumnIndex, obdobi);
        					edge.getAttributes().setValue(cisloHlasovaniColumnIndex, cisloHlasovani);
        					edge.getAttributes().setValue(temaHlasovaniColumnIndex, temaHlasovani);
        					edge.getAttributes().setValue(timeIntervalColumnIndex, timeInterval);
        		        	if (graph.addEdge(edge)) {
        		        		++l;
        		        	} else {
        		        		++m;
        		        	}
        		        	++k;
        		        	
        				}
        			}
        		}
        		System.out.println("added edges " + k + " added edges " + l + " added edges " + m);
        	}
        }

        
        
        //Export full graph
        ExportController ec = Lookup.getDefault().lookup(ExportController.class);
        try {
            ec.exportFile(new File(FILE_PATH), workspace);
        } catch (IOException ex) {
            ex.printStackTrace();
            return;
        } finally {
        	pc.closeCurrentWorkspace();
        	pc.closeCurrentProject();
        }
         

	}
	
	private AttributeColumn getTimeIntervalColumn(AttributeTable table) {
        AttributeColumn column = table.getColumn(DynamicModel.TIMEINTERVAL_COLUMN);
        if (column == null) {
            column = table.addColumn(DynamicModel.TIMEINTERVAL_COLUMN, "Time Interval", AttributeType.TIME_INTERVAL, AttributeOrigin.PROPERTY, null);
        }
        return column;
    }

}
