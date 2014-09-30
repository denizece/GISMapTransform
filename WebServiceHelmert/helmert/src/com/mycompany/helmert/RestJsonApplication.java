package com.mycompany.helmert;

 
import com.sun.jersey.api.core.PackagesResourceConfig;
import javax.ws.rs.ApplicationPath;
 
@ApplicationPath("/")
public class RestJsonApplication extends PackagesResourceConfig {
    public RestJsonApplication() {
        super("com.mycompany.helmert.impl");
    }
}
