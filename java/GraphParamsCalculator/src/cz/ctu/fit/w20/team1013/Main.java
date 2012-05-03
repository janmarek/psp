package cz.ctu.fit.w20.team1013;

import java.util.Date;
import java.util.List;
import java.util.Map;

import com.mongodb.DB;

public class Main {

	/**
	 * @param args
	 */
	public static void main(String[] args) throws Exception {
		MongoDatabase mongoDatabase = new MongoDatabase();
		
		try {
			mongoDatabase.connect();
			Map<Integer, String[]> poslanci = mongoDatabase.getPoslanci();
	        Map<Date, List<Object[]>> hlasovani = mongoDatabase.getHlasovaniBySnapshot();
			
			GexfBaseCreator gexfBaseCreator = new GexfBaseCreator();
			AvarageMetricsCreator avarageMetricsCreator = new AvarageMetricsCreator(mongoDatabase);
			GexfFinalCreator gexfFinalCreator = new GexfFinalCreator();
			gexfBaseCreator.generateGexf(poslanci, hlasovani);
			gexfFinalCreator.generateGexf(poslanci, hlasovani);
			avarageMetricsCreator.generateMetrics(poslanci, hlasovani);
			
			
		} finally {
			if (mongoDatabase != null) {
				mongoDatabase.disconnect();
			}
		}

	}

}
