ColorBrewer-Lite
==============

This project extends the popular [ColorBrewer](http://colorbrewer2.org/) -- a web tool for guidance in choosing choropleth map color schemes -- for modifying color scales in Vega-Lite specifications.

To achieve this, we utilize [ReModel's](https://www.npmjs.com/package/remodel-vis) import and export classes to modify color encodings in all partial views in composite visualizations.
After selecting a target view, all color encodings from Vega-Lite (```color```, ```fill```, ```stroke```) can be set, mapping to any field of the included dataset.

ColorBrewer is based on the research of [Dr. Cynthia Brewer](http://www.personal.psu.edu/cab38/). Built and maintained by [Axis Maps](http://axismaps.com).

Questions, problems, or other feedback? [File an issue!](https://github.com/axismaps/colorbrewer/issues)
