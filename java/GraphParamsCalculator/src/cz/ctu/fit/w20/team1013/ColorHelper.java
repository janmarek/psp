
package cz.ctu.fit.w20.team1013;

import java.util.HashMap;

public class ColorHelper {
    private static final float[][] colorTable = {
        {0.9098039215686274f, 0.44313725490196076f, 0.08627450980392157f},
        {0.8470588235294118f, 0.13333333333333333f, 0.10980392156862745f},
        {0.10980392156862745f, 0.3176470588235294f, 1f},
        {0.5215686274509804f, 0.19607843137254902f, 0.7568627450980392f},
        {0.9411764705882353f, 0.8470588235294118f, 0.12941176470588237f},
        {0.5333333333333333f, 0.5333333333333333f, 0.5333333333333333f}
    };
    private static final String[] parties = {
        "ČSSD",
        "KSČM",
        "ODS",
        "TOP09-S",
        "VV",
        "_"
        };
    private static final HashMap<String, Integer> partyToColor = new HashMap<String, Integer>();

    static {
        for (int i = 0; i < parties.length; i++) {
           partyToColor.put(parties[i], i);
        }
    }
    
    public static float[] get(String party) {
        if (!partyToColor.containsKey(party)) {
            party = "_";
        }
        return colorTable[partyToColor.get(party)];
    }
}
