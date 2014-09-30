package com.mycompany.helmert.impl;

import com.mycompany.helmert.ItemResource;
import com.mycompany.helmert.Point;
import com.mycompany.helmert.Request;
import java.util.List;
import javax.ws.rs.Path;
import Jama.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@Path("/map")
public class ItemResourceImpl implements ItemResource {

    @Override
    public String map(Request req) {
        if (req == null) {
            return "error";
        }
        List<Point> inp = req.getInp();
        if (inp == null) {
            return "no input points";
        }
        List<Point> out = req.getOut();
        if (out == null) {
            return "no input points";
        }

        int size = inp.size() < out.size() ? inp.size() : out.size();
        if (size < 2) {
            return "insufficient data";
        }

        HelmertTransform ht = fit(inp, out, size);
        //System.out.println(inp);
        //System.out.println(out);
        System.out.println(ht);

        //test(inp);
        
        try {
            JSONObject map = new JSONObject(req.getMap());
            // Do the transform
            transform(map, ht);
            
            return map.toString(1);
            
        } catch (JSONException e) {
            // Or return an error
            return e.toString();
        }
    }

    private class HelmertTransform {

        private double a, b, e, f;

        public HelmertTransform() {
            a = Math.random();
            b = Math.random();
            e = 100 * Math.random();
            f = 100 * Math.random();
        }

        @Override
        public String toString() {
            return "HelmertTransform{" + "a=" + a + ", b=" + b + ", e=" + e + ", f=" + f + '}';
        }

        double getX(double x, double y) {
            return a * x - b * y + e;
        }

        double getY(double x, double y) {
            return b * x + a * y + f;
        }
    }

    private HelmertTransform fit(List<Point> inp, List<Point> out, int size) {
        double[][] y = new double[size * 2][1];
        double[][] H = new double[size * 2][4];

        for (int i = 0; i < size; ++i) {
            y[i * 2 + 0][0] = out.get(i).getX();
            y[i * 2 + 1][0] = out.get(i).getY();

            H[i * 2 + 0][0] = inp.get(i).getX();
            H[i * 2 + 0][1] = -inp.get(i).getY();
            H[i * 2 + 0][2] = 1.0;
            H[i * 2 + 0][3] = 0.0;

            H[i * 2 + 1][0] = inp.get(i).getY();
            H[i * 2 + 1][1] = inp.get(i).getX();
            H[i * 2 + 1][2] = 0.0;
            H[i * 2 + 1][3] = 1.0;
        }

        Matrix ym = new Matrix(y);
        Matrix Hm = new Matrix(H);
        Matrix HmT = Hm.transpose();

        Matrix x = (HmT.times(Hm)).inverse().times(HmT).times(ym);

        HelmertTransform rv = new HelmertTransform();

        rv.a = x.get(0, 0);
        rv.b = x.get(1, 0);
        rv.e = x.get(2, 0);
        rv.f = x.get(3, 0);

        return rv;
    }
    
    private void test(List<Point> inp) {
        HelmertTransform it = new HelmertTransform();
        List<Point> out = new ArrayList<>();
        for (Point i : inp) {
            Point o = new Point();
            o.setX(it.getX(i.getX(), i.getY()));
            o.setY(it.getY(i.getX(), i.getY()));
            out.add(o);
        }
        HelmertTransform ot = fit(inp, out, inp.size());

        System.out.println(it);
        System.out.println(ot);
    }
    
    private static void transform(JSONObject json, HelmertTransform ht) throws JSONException {
        Iterator<String> keys = json.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object object = json.opt(key);
            if (object instanceof JSONObject) {
                // keep recursing
                transform((JSONObject)object, ht);
            } else if (object instanceof JSONArray) {
                if ("coordinates".equals(key)) {
                    // If you find coordinates, then replace
                    // them with the transformed value
                    json.put(key, transformCoordinate((JSONArray)object, ht));
                }
                else {
                    // It is Json Array
                    JSONArray jar = (JSONArray)object;
                    for (int i = 0; i < jar.length(); ++i) {
                        JSONObject ob = jar.optJSONObject(i);
                        if (ob!=null) {
                            // keep recursing
                            transform(ob, ht);
                        }
                    }
                }
            }
        }
    }
    
    private static Collection transformCoordinate(JSONArray jar, HelmertTransform ht) throws JSONException {
        ArrayList al = new ArrayList();
        
        for (int i = 0; i < jar.length(); ++i) {
            JSONArray injar = jar.optJSONArray(i);
            if (injar!=null) {
                //SubArray. Recurse :/ ... Good news - it only goes to level 2
                al.add(transformCoordinate(injar, ht));
            }
            else {
                // In this case the length should be 2 and there should be
                // two doubles
                if (jar.length() != 2 || i != 0) {
                    throw new JSONException("Unexpected lenght of coordinate: " + jar.length());
                }
                
                al.add(ht.getX(jar.getDouble(0), jar.getDouble(1)));
                al.add(ht.getY(jar.getDouble(0), jar.getDouble(1)));
                
                break;
            }
        }
        
        return al;
    }
}
