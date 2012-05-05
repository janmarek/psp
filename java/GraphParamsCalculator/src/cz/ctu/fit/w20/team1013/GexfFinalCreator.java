package cz.ctu.fit.w20.team1013;

import java.io.File;
import java.io.IOException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.UUID;

import org.gephi.data.attributes.api.AttributeColumn;
import org.gephi.data.attributes.api.AttributeController;
import org.gephi.data.attributes.api.AttributeModel;
import org.gephi.data.attributes.api.AttributeOrigin;
import org.gephi.data.attributes.api.AttributeTable;
import org.gephi.data.attributes.api.AttributeType;
import org.gephi.data.attributes.type.DynamicDouble;
import org.gephi.data.attributes.type.DynamicInteger;
import org.gephi.data.attributes.type.Interval;
import org.gephi.data.attributes.type.TimeInterval;
import org.gephi.dynamic.api.DynamicController;
import org.gephi.dynamic.api.DynamicGraph;
import org.gephi.dynamic.api.DynamicModel;
import org.gephi.graph.api.Edge;
import org.gephi.graph.api.Graph;
import org.gephi.graph.api.GraphController;
import org.gephi.graph.api.GraphModel;
import org.gephi.graph.api.Node;
import org.gephi.graph.api.NodeIterable;
import org.gephi.graph.api.UndirectedGraph;
import org.gephi.io.exporter.api.ExportController;
import org.gephi.project.api.ProjectController;
import org.gephi.project.api.Workspace;
import org.gephi.statistics.plugin.ClusteringCoefficient;
import org.openide.util.Lookup;

import com.mongodb.BasicDBList;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;

import cz.cvut.fit.gephi.snametrics.clusteringcoefficient.ClusteringMetric;
import cz.cvut.fit.gephi.snametrics.erdosnumber.ErdosNumberMetric;
import cz.cvut.fit.gephi.snametrics.overlap.OverlapMetric;


public class GexfFinalCreator {
	
	private static final String FILE_PATH = "../../tmp/cachev2final.gexf";

	public GexfFinalCreator() {
		super();
	}
	
	public void generateGexf(Map<Integer, String[]> poslanci, Map<Date, Object[]> hlasovani) throws Exception {
		//Init a project - and therefore a workspace
        ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
        pc.newProject();
        Workspace workspace = pc.getCurrentWorkspace();

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
//        AttributeTable tableNode = attributeModel.getNodeTable();
//        AttributeColumn timeIntervalColumnNode = getTimeIntervalColumn(tableNode);
//        int timeIntervalColumnNodeIndex = timeIntervalColumnNode.getIndex();
        
        Map<Integer, Node> poslanciNodes = new HashMap<Integer, Node>();
        List<Date> sortedDates = new ArrayList<Date>(hlasovani.keySet());
        Collections.sort(sortedDates);
//        Date firstDate = sortedDates.get(0);
//        TimeInterval timeIntervalNode = new TimeInterval(firstDate.getTime(), Double.POSITIVE_INFINITY);
        Node centerOfTheUniverse = null;
        for (Entry<Integer, String[]> poslanec : poslanci.entrySet()) {
        	Node node = graphModel.factory().newNode(String.valueOf(poslanec.getKey()));
        	node.getNodeData().setLabel(poslanec.getValue()[0]);
            float color[] = ColorHelper.get(poslanec.getValue()[1]);
            node.getNodeData().setColor(color[0], color[1], color[2]);
        	//node.getNodeData().setColor(Float.intBitsToFloat(sha1hash[0]), Float.intBitsToFloat(sha1hash[1]), Float.intBitsToFloat(sha1hash[2]));
        	node.getAttributes().setValue(stranaColumnIndex, poslanec.getValue()[1]);
//        	node.getAttributes().setValue(timeIntervalColumnNodeIndex, timeIntervalNode);
        	graph.addNode(node);
        	poslanciNodes.put(poslanec.getKey(), node);
        	centerOfTheUniverse = node; 
        	
        }

        for (int i = 0; i < sortedDates.size(); i++) {
        	Date startDate = sortedDates.get(i);
        	long startDateLong = startDate.getTime();
        	Date endDate = null;
        	if (i + 1 < sortedDates.size()) {
        		endDate = sortedDates.get(i + 1);
        	}
        	
        	TimeInterval timeInterval = new TimeInterval(startDate.getTime(), endDate != null ? endDate.getTime() : Double.POSITIVE_INFINITY);
        	@SuppressWarnings("unchecked")
			List<Object[]> hlasovaniList = (List<Object[]>) hlasovani.get(startDate)[1];
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
//        					Edge edge = graphModel.factory().newEdge(
//        							startDateLong + "_" + idSchuze + "_" + obdobi
//        							 + "_" + cisloHlasovani , nd1, poslanciNodes.get(d2), 1, false);
        					
        					Edge edge = graphModel.factory().newEdge(UUID.randomUUID().toString() , nd1, poslanciNodes.get(d2), 1, false);
        					
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
        	
        	
        	
        }
        
        Lookup.getDefault().lookup(DynamicController.class).setTimeFormat(DynamicModel.TimeFormat.DATE);     
        
        
        DynamicModel dynamicModel = Lookup.getDefault().lookup(DynamicController.class).getModel();
	    DynamicGraph dynamicGraph = dynamicModel.createDynamicGraph(graph);
	    computeEdgeParameters(dynamicGraph, sortedDates);
	    computeNodeParameters(dynamicGraph, sortedDates, centerOfTheUniverse);
        


//		 //Init a project - and therefore a workspace
//	    ProjectController pc = Lookup.getDefault().lookup(ProjectController.class);
//	    pc.newProject();
//	    Workspace workspace = pc.getCurrentWorkspace();
//	 
//	    //Generate a new random graph into a container
//	    Container container = Lookup.getDefault().lookup(ContainerFactory.class).newContainer();
//	    RandomGraph randomGraph = new RandomGraph();
//	    randomGraph.setNumberOfNodes(500);
//	    randomGraph.setWiringProbability(0.005);
//	    randomGraph.generate(container.getLoader());
//	 
//	    //Append container to graph structure
//	    ImportController importController = Lookup.getDefault().lookup(ImportController.class);
//	    importController.process(container, new DefaultProcessor(), workspace);
//	 
//	    //Add a fake 'Date' column to nodes
//	    AttributeModel attributeModel = Lookup.getDefault().lookup(AttributeController.class).getModel();
//	    AttributeColumn dateColumn = attributeModel.getNodeTable().addColumn("date", AttributeType.INT);
//	 
//	    //Add a random date to all nodes - between 1990 and 2010
//	    GraphModel graphModel = Lookup.getDefault().lookup(GraphController.class).getModel();
//	    Graph graph = graphModel.getGraph();
//	    Random random = new Random();
//	    for (Node n : graph.getNodes()) {
//	        Integer randomDataValue = new Integer(random.nextInt(21) + 1990);
//	        n.getNodeData().getAttributes().setValue(dateColumn.getIndex(), randomDataValue);
//	    }
//	 
//	    //Use the Data laboratory merge strategy to convert this Integer column to the TimeInterval column
//	    AttributeColumnsMergeStrategiesController dataLabController = Lookup.getDefault().lookup(AttributeColumnsMergeStrategiesController.class);
//	    dataLabController.mergeNumericColumnsToTimeInterval(attributeModel.getNodeTable(), dateColumn, null, 1990, 2010);
//	 
//	    //Use the DynamicModel dynamic graph factory
//	    DynamicModel dynamicModel = Lookup.getDefault().lookup(DynamicController.class).getModel();
//	    DynamicGraph dynamicGraph = dynamicModel.createDynamicGraph(graph);
//
//	 
//	    //Get the number of nodes for each period of one year - and store it in a proper data structure
//	    DynamicInteger numberofNodes = new DynamicInteger();
//	    for (int i = 1990; i < 2009; i++) {
//	        int low = i;
//	        int high = i + 1;
//	        Graph subGraph = dynamicGraph.getSnapshotGraph(low, high);
//	        int count = subGraph.getNodeCount();
//	        numberofNodes = new DynamicInteger(numberofNodes, new Interval<Integer>(low, high, count));   //DynamicInteger is immutable
//	    }
//	 
//	    //Get all intervals and print values
//	    System.out.println("Number of nodes:");
//	    for (Interval<Integer> interval : numberofNodes.getIntervals(Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)) {
//	        int low = (int) interval.getLow();
//	        int high = (int) interval.getHigh();
//	        System.out.println(low + "-" + high + "  ->  " + interval.getValue());
//	    }
	 
//	    //Create a InOutDegree metric to get the average degree for each time interval
//	    InOutDegree inOutDegree = new InOutDegree();
//	 
//	    //Compute the metric for each subgraph and put result in a DynamicDouble
//	    DynamicDouble averageDegree = new DynamicDouble();
//	    for (int i = 1990; i < 2009; i++) {
//	        int low = i;
//	        int high = i + 1;
//	        Graph subGraph = dynamicGraph.getSnapshotGraph(low, high);
//	        inOutDegree.execute(subGraph, attributeModel);
//	        double result = inOutDegree.getAverageDegree();
//	        averageDegree = new DynamicDouble(averageDegree, new Interval<Double>(low, high, result));
//	    }
//	 
//	    //Get all intervals and print values
//	    System.out.println("Average degree:");
//	    for (Interval<Double> interval : averageDegree.getIntervals(Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)) {
//	        int low = (int) interval.getLow();
//	        int high = (int) interval.getHigh();
//	        System.out.println(low + "-" + high + "  ->  " + interval.getValue());
//	    }
	    
        
        //Export full graph
        ExportController ec = Lookup.getDefault().lookup(ExportController.class);
        try {
            ec.exportFile(new File(FILE_PATH));
        } catch (IOException ex) {
            ex.printStackTrace();
            return;
        } finally {
        	pc.closeCurrentWorkspace();
        	pc.closeCurrentProject();
        }
         

	}
	
	private void computeEdgeParameters(DynamicGraph dynamicGraph, List<Date> sortedDates) {
		AttributeModel attributeModel = Lookup.getDefault().lookup(AttributeController.class).getModel();
        AttributeColumn overlapColumn = attributeModel.getEdgeTable().addColumn("overlapd", AttributeType.DYNAMIC_DOUBLE);
        int overlapColumnIndex = overlapColumn.getIndex();
        AttributeColumn embeddednessnColumn = attributeModel.getEdgeTable().addColumn("embeddednessd", AttributeType.DYNAMIC_INT);
        int embeddednessnColumnIndex = embeddednessnColumn.getIndex();
        
		double startDateLong = sortedDates.get(0).getTime();
		for (int i = 0; i < sortedDates.size(); i++) {
        	double endDateLong = Double.POSITIVE_INFINITY;
        	if (i + 1 < sortedDates.size()) {
        		endDateLong = sortedDates.get(i + 1).getTime();
        	}

			 Graph subGraph = dynamicGraph.getSnapshotGraph(startDateLong, endDateLong);
			 ClusteringCoefficient clusteringMetric = new ClusteringCoefficient();
			 OverlapMetric overlapMetric = new OverlapMetric();
			 overlapMetric.execute(subGraph.getGraphModel(), attributeModel);
			 clusteringMetric.execute(subGraph.getGraphModel(), attributeModel);
			
			 Iterator<Edge> iterator = subGraph.getEdges().iterator();
			
			 AttributeColumn neighborhoodOverlapColumn = attributeModel.getEdgeTable().getColumn("neighborhoodOverlap");
			 int neighborhoodOverlapColumnIndex = neighborhoodOverlapColumn.getIndex();
			 AttributeColumn embeddednessColumn = attributeModel.getEdgeTable().getColumn("embeddedness");
			 int embeddednessColumnIndex = embeddednessColumn.getIndex();
			 int j = 0;
			 while (iterator.hasNext()) {
				 j++;
			     Edge edge = iterator.next();
			     Double overlapCoefficient = (Double) edge.getAttributes().getValue(neighborhoodOverlapColumnIndex);   
			     Integer embeddedness = (Integer) edge.getAttributes().getValue(embeddednessColumnIndex);
			     
			     DynamicDouble overlapCoefficientD = (DynamicDouble) edge.getAttributes().getValue(overlapColumnIndex);
			     if (overlapCoefficientD == null) {
			    	 overlapCoefficientD = new DynamicDouble(new Interval<Double>(startDateLong, endDateLong, overlapCoefficient));
			     } else {
			    	 overlapCoefficientD = new DynamicDouble(overlapCoefficientD, new Interval<Double>(startDateLong, endDateLong, overlapCoefficient));
			     }
			     edge.getAttributes().setValue(overlapColumnIndex, overlapCoefficientD);
			     DynamicInteger embeddednessD = (DynamicInteger) edge.getAttributes().getValue(embeddednessnColumnIndex);
			     if (embeddednessD == null) {
			    	 embeddednessD = new DynamicInteger(new Interval<Integer>(startDateLong, endDateLong, embeddedness));
			     } else {
			    	 embeddednessD = new DynamicInteger(embeddednessD, new Interval<Integer>(startDateLong, endDateLong, embeddedness));
			     }
			     edge.getAttributes().setValue(embeddednessnColumnIndex, embeddednessD);
			 }
			 System.out.println(j + " created ");
		}
	}
	
	private void computeNodeParameters(DynamicGraph dynamicGraph, List<Date> sortedDates, Node centerOfTheUniverse) {
		AttributeModel attributeModel = Lookup.getDefault().lookup(AttributeController.class).getModel();
        AttributeColumn erdosColumn = attributeModel.getNodeTable().addColumn("erdosd", AttributeType.DYNAMIC_INT);
        int erdosColumnIndex = erdosColumn.getIndex();
        AttributeColumn clusteringColumn = attributeModel.getNodeTable().addColumn("clusteringd", AttributeType.DYNAMIC_DOUBLE);
        int clusteringColumnIndex = clusteringColumn.getIndex();
        
		double startDateLong = sortedDates.get(0).getTime();
		for (int i = 0; i < sortedDates.size(); i++) {
        	double endDateLong = Double.POSITIVE_INFINITY;
        	if (i + 1 < sortedDates.size()) {
        		endDateLong = sortedDates.get(i + 1).getTime();
        	}

			 Graph subGraph = dynamicGraph.getSnapshotGraph(startDateLong, endDateLong);
			 
			 
			 ClusteringCoefficient clusteringMetric = new ClusteringCoefficient();
			 OverlapMetric overlapMetric = new OverlapMetric();
			 overlapMetric.execute(subGraph.getGraphModel(), attributeModel);
			 clusteringMetric.execute(subGraph.getGraphModel(), attributeModel);
			 ErdosNumberMetric metric = new ErdosNumberMetric();
             metric.setSourceNode(centerOfTheUniverse);
             metric.execute(subGraph.getGraphModel(), attributeModel);
             
             AttributeColumn clusteringCoeffColumn = attributeModel.getNodeTable().getColumn(ClusteringCoefficient.CLUSTERING_COEFF);
             int clusteringCoeffColumnInde = clusteringCoeffColumn.getIndex();
             AttributeColumn erdosNumberColumn = attributeModel.getNodeTable().getColumn("erdosNumber");
             int erdosNumberColumnIndex = erdosNumberColumn.getIndex();

             Iterator<Node> iterator = subGraph.getNodes().iterator();
             
             while (iterator.hasNext()) {
                 Node node = iterator.next();

                 Double clustering = (Double) node.getAttributes().getValue(clusteringCoeffColumnInde);
                 Integer erdosNumber = (Integer) node.getAttributes().getValue(erdosNumberColumnIndex);
                 
                 DynamicInteger erdosD = (DynamicInteger) node.getAttributes().getValue(erdosColumnIndex);
			     if (erdosD == null) {
			    	 erdosD = new DynamicInteger(new Interval<Integer>(startDateLong, endDateLong, erdosNumber));
			     } else {
			    	 erdosD = new DynamicInteger(erdosD, new Interval<Integer>(startDateLong, endDateLong, erdosNumber));
			     }
			     node.getAttributes().setValue(erdosColumnIndex, erdosD);
			     DynamicDouble clusteringD = (DynamicDouble) node.getAttributes().getValue(clusteringColumnIndex);
			     if (clusteringD == null) {
			    	 clusteringD = new DynamicDouble(new Interval<Double>(startDateLong, endDateLong, clustering));
			     } else {
			    	 clusteringD = new DynamicDouble(clusteringD, new Interval<Double>(startDateLong, endDateLong, clustering));
			     }
			     node.getAttributes().setValue(clusteringColumnIndex, clusteringD);

             }
			 
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
