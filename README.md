# shivers
SAP HANA Information View dependency graphs.

This is a simple tool that for analyzing and visualizing dependencies between HANA information views (calculation views, attribute views, and analytic views) and their base objects (tables).

Shivers is a single webpage that runs in the browser (tested: chrome 57 / Internet Explorer 11). 
Shivers can be started by opening the index.html file directly from disk in your web browser.
You do not need to set up a HANA XS application or upload it to a webserver.

To use the tool, the workflow is like this:

1) Open index.html in your browser. This will automatically open a "Welcome!" tab where you can read instructions to use the tool.
2) Use the button on the toolbar to open information view sources (.analyticview, .attributeview and .calculationview files) using a file browser. You would have those sources in local disk if you have been developing with SAP HANA studio and checked them out from the SAP HANA repository.
3) After selecting files, you will be prompted to provide a package name. You can either use an actual package name (like acme.org.models) or a path name (like acme/org/models or acme\org\models). Shivers needs the package name to resolve any references to other information views, and as strange as it may seem, the package name of the views is not itself stored in the information view source. (If it is, kindly let me know so I can get rid of this annoying step in the process).
4) The package will appear in the treeview on the left-hand side of the screen, and the information views will appear beneath the pacakge  too.
5) When clicking one of the views in the treeview, a tab will open inside the shivers window, showing a graph of your information view. The layout may not be to your liking, but you can drag items inside the graph and place them anywhere you like. You can use the mouse wheel to zoom in/out.
6) Once you are happy with your graph, you right click it, and choose "Save image as..." so you can store the graph as an image so you can use it to create technical documentation, or share it with your co-workers.

## FAQ

Here are some answers to questions you might have about shivers.

### What is Shivers?

This is a simple tool that for analyzing and visualizing dependencies between HANA information views (calculation views, attribute views, and analytic views) and their base objects (tables).

### Why Shivers?

Shivers was created by Just-BI as an aid in producing technical documentation for SAP/HANA projects.
We created it because there didn't seem anything else around that could visualize dependency graphs of across information views.

### Who should use it?

Target audience is SAP/HANA developers, technical enterprise architects, SAP/HANA Database Administrators, and technical writers.

### Why is your application called "Shivers"

Shivers stands for Sap Hana Information Viewers. The name was conceived not unlike "Hadacol"'s was.