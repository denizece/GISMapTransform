package com.mycompany.helmert;

import java.util.List;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
public class Request {

    private String map;
    private List<Point> inp;
    private List<Point> out;

    public String getMap() {
        return map;
    }

    public void setMap(String map) {
        this.map = map;
    }

    public List<Point> getInp() {
        return inp;
    }

    public void setInp(List<Point> inp) {
        this.inp = inp;
    }

    public List<Point> getOut() {
        return out;
    }

    public void setOut(List<Point> out) {
        this.out = out;
    }

}
