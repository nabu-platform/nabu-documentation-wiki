// distribution from: https://cdn.jsdelivr.net/npm/frappe-charts@1.5.3/dist/

window.addEventListener("load", function () {
	// check out: https://frappe.io/charts/docs
	var frappeChartGenerator = function(name) {
		return Vue.component(name, {
			template: "#" + name,
			mixins: [nabu.page.views.data.DataCommon],
			props: {
				page: {
					type: Object,
					required: true
				},
				parameters: {
					type: Object,
					required: false
				},
				cell: {
					type: Object,
					required: true
				},
				edit: {
					type: Boolean,
					required: true
				}
			},
			computed: {
				hasBar: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "bar";
					}).length >= 1;
				},
				hasMultipleBars: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "bar";
					}).length >= 2;
				},
				hasLines: function() {
					return this.cell.state.datasets && this.cell.state.datasets.filter(function(x) {
						return x.type == "line";
					}).length >= 1;
				},
				type: function() {
					return !this.cell.state.type ? "mixed" : this.cell.state.type;
				}
			},
			data: function() {
				return {
					configuring: false
				}
			},
			beforeDestroy: function() {
				this.$services.page.destroy(this);
			},
			created: function() {
				this.create();
				if (!this.cell.state.bindings) {
					Vue.set(this.cell.state, "bindings", {});
				}
				if (!this.cell.state.datasets) {
					Vue.set(this.cell.state, "datasets", []);
				}
				if (!this.cell.state.labelFormat) {
					Vue.set(this.cell.state, "labelFormat", {});
				}
			},
			activate: function(done) {
				var self = this;
				this.activate(function() {
					done();
				}, done);
			},
			ready: function() {
				this.draw();
			},
			methods: {
				configurator: function() {
					return "frappe-chart-configure";
				},
				getKeys: function(name) {
					return this.keys.filter(function(x) {
						return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
					});
					var keys = this.cell.state.operation ? this.$services.page.getSimpleKeysFor({properties:this.$services.data.getDefinition(this.cell.state.operation)}) : [];
					if (name) {
						keys = keys.filter(function(x) { return x.toLowerCase().indexOf(name.toLowerCase()) >= 0 });
					}
					return keys;
				},
				execute: function() {
					var promise = this.$services.q.defer();
					var self = this;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					try {
						if (this.cell.state.operation) {
							// any input parameters
							var parameters = {};
							if (this.cell.bindings) {
								Object.keys(this.cell.bindings).forEach(function(key) {
									if (self.cell.bindings[key]) {
										parameters[key] = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[key], self);
									}
								});
							}
							this.$services.data.execute(this.cell.state.operation, parameters).then(function(result) {
								if (result) {
									if (!(result instanceof Array)) {
										Object.keys(result).forEach(function(x) {
											if (result[x] instanceof Array) {
												result = result[x];
											}
										});
									}
									if (result instanceof Array) {
										nabu.utils.arrays.merge(self.records, result);
										promise.resolve(result);
									}
								}
							}, promise);
						}
						else {
							promise.resolve();
						}
					}
					catch (exception) {
						console.error("Could not run operation", exception);
						promise.reject();
					}
					return promise;
				},
				draw: function() {
					var self = this;
					if (this.records.length && this.$refs.chart) {
						var parameters = {
							type: this.type == "mixed" ? "axis-mixed" : this.type,
							data: {
								datasets: []
							},
							colors: [],
							tooltipOptions: {
								formatTooltipX: function(d) {
									if (self.cell.state.popupLabelFormat) {
										var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
										cloned.state = null;
										cloned.$value = self.$value;
										d = self.$services.formatter.format(d, cloned);
									}
									return d;
								},
								formatTooltipY: function(d) {
									// we have a float, round it
									if (typeof(d) == "number" && parseInt(d) != d) {
										return self.$services.formatter.number(d, 2);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9]+$/)) {
										return parseInt(d);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9.]+$/)) {
										return parseFloat(d);
									}
									return d;
								}
							},
							barOptions: {},
							lineOptions: {},
							axisOptions: {}
						};
						if (self.cell.state.title) {
							// we now do the title in data common
							//parameters.title = this.$services.page.translate(self.cell.state.title);
						}
						// if we have a label field, use that
						if (this.cell.state.label) {
							parameters.data.labels = this.records.map(function(x) {
								var value = self.$services.page.getValue(x, self.cell.state.label);
								if (self.cell.state.labelFormat) {
									// want to add the state
									var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
									cloned.state = x;
									cloned.$value = self.$value;
									value = self.$services.formatter.format(value, cloned);
								}
								return value;
							});
						}
						if (this.cell.state.datasets && this.cell.state.datasets.length) {
							var datasets = [];
							nabu.utils.arrays.merge(datasets, this.cell.state.datasets);
							// we want to draw bar charts first, otherwise they provide an offset for the line charts (check out frappe documentation)
							datasets.sort(function(a, b) {
								if (a.type == "bar" && b.type != "bar") {
									return -1;
								}
								else if (b.type == "bar" && a.type != "bar") {
									return 1;
								}
								return 0;
							});
							datasets.forEach(function(x) {
								var hasData = false;
								var values = self.records.map(function(y) {
									var value = self.$services.page.getValue(y, x.value);
									if (x.format) {
										value = self.$services.formatter.format(value, x.format);
									}
									if (value != null) {
										hasData = true;
									}
									return value == null ? 0 : value;
								});
								if (hasData) {
									parameters.data.datasets.push({
										name: self.$services.page.translate(x.name),
										chartType: x.type ? x.type : 'line',
										values: values
									});
									parameters.colors.push(x.color ? x.color : self.$services.page.getNameColor(x.name ? x.name : "unnamed" + Math.random()));
								}
							});
						}
						if (this.cell.state.stackBars) {
							parameters.barOptions.stacked = 1;
						}
						if (this.cell.state.valuesOverPoints) {
							parameters.valuesOverPoints = 1;
						}
						if (this.cell.state.hideDots) {
							parameters.lineOptions.hideDots = 1;
						}
						if (this.cell.state.hideLine) {
							parameters.lineOptions.hideLine = 1;
						}
						if (this.cell.state.regionFill) {
							parameters.lineOptions.regionFill = 1;
						}
						if (this.cell.state.xIsSeries) {
							parameters.axisOptions.xIsSeries = true;
						}
						if (this.cell.state.spaceRatio) {
							parameters.barOptions.spaceRatio = parseFloat(this.cell.state.spaceRatio);
						}
						if (this.cell.state.dotSize) {
							parameters.lineOptions.dotSize = parseInt(this.cell.state.dotSize);
						}
						if (this.cell.state.navigable) {
							parameters.isNavigable = this.cell.state.navigable;
						}
						if (this.cell.state.maxSlices) {
							parameters.maxSlices = parseInt(this.cell.state.maxSlices);
						}
						if (this.cell.state.height) {
							parameters.height = parseInt(this.cell.state.height);
						}
						console.log("drawing", this.$refs.chart, parameters);
						var chart = new frappe.Chart(this.$refs.chart, parameters);
		//				chart.export();
						// update the entire data set (only data? not settings etc)
		//				chart.update(data);
					}
				}
			},
			watch: {
				'records': function() {
					this.draw();	
				},
				'cell.state.operation': function(newValue) {
					if (newValue) {
						if (!this.cell.state.type) {
							this.cell.state.type = "mixed";
						}
						if (!this.cell.state.label) {
							var self = this;
							var definition = this.$services.data.getDefinition(this.cell.state.operation);
							Object.keys(definition).forEach(function(key) {
								if (!self.cell.state.label && (definition[key].type == "string" || !definition[key].type)) {
									self.cell.state.label = key;
								}
							});
						}
						if (!this.cell.state.datasets.length) {
							var self = this;
							var definition = this.$services.data.getDefinition(this.cell.state.operation);
							Object.keys(definition).forEach(function(key) {
								if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
									var dataset = {
										type: "bar",
										valueFormat: {}
									};
									dataset.value = key;
									dataset.name = key;
									self.cell.state.datasets.push(dataset);
								}
							});
						}
						this.load().then(this.draw);
					}
				}
			}
		});
	}
	
	var frappeAggregateChartGenerator = function(name) {
		// check out: https://frappe.io/charts/docs
		Vue.component(name, {
			template: "#" + name,
			mixins: [nabu.page.views.data.DataCommon],
			props: {
				page: {
					type: Object,
					required: true
				},
				parameters: {
					type: Object,
					required: false
				},
				cell: {
					type: Object,
					required: true
				},
				edit: {
					type: Boolean,
					required: true
				}
			},
			data: function() {
				return {
					configuring: false
				}
			},
			beforeDestroy: function() {
				this.$services.page.destroy(this);
			},
			created: function() {
				this.create();
				if (!this.cell.state.bindings) {
					Vue.set(this.cell.state, "bindings", {});
				}
				if (!this.cell.state.dataset) {
					Vue.set(this.cell.state, "dataset", {valueFormat: {}});
				}
				if (!this.cell.state.labelFormat) {
					Vue.set(this.cell.state, "labelFormat", {});
				}
			},
			activate: function(done) {
				var self = this;
				this.activate(function() {
					done();
				}, done);
			},
			ready: function() {
				this.draw();
			},
			methods: {
				configurator: function() {
					return "frappe-aggregate-chart-configure";
				},
				getKeys: function(name) {
					return this.keys.filter(function(x) {
						return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
					});
					var keys = this.cell.state.operation ? this.$services.page.getSimpleKeysFor({properties:this.$services.data.getDefinition(this.cell.state.operation)}) : [];
					if (name) {
						keys = keys.filter(function(x) { return x.toLowerCase().indexOf(name.toLowerCase()) >= 0 });
					}
					return keys;
				},
				draw: function() {
					var self = this;
					if (this.records.length && this.$refs.chart) {
						var parameters = {
							type: this.cell.state.type ? this.cell.state.type : "pie",
							data: {
								datasets: []
							},
							colors: [],
							tooltipOptions: {
								formatTooltipX: function(d) {
									if (self.cell.state.popupLabelFormat) {
										var cloned = nabu.utils.objects.clone(self.cell.state.popupLabelFormat);
										cloned.state = null;
										cloned.$value = self.$value;
										d = self.$services.formatter.format(d, cloned);
									}
									return d;
								},
								formatTooltipY: function(d) {
									// we have a float, round it
									if (typeof(d) == "number" && parseInt(d) != d) {
										return self.$services.formatter.number(d, 2);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9]+$/)) {
										return parseInt(d);
									}
									else if (typeof(d) == "string" && d.match && d.match(/^[0-9.]+$/)) {
										return parseFloat(d);
									}
									return d;
								}
							},
							barOptions: {},
							lineOptions: {},
							axisOptions: {}
						};
						// there seems to be no configurable way to tell frappe to start at a certain point
						// so we just add a marker at that point with no label, forcing frappe to take it into account
						// note that if we pass in an empty array of yMarkers, frappe fails...
						if (self.cell.state.minimumYValue != null && self.cell.state.minimumYValue != "") {
							parameters.data.yMarkers = [{
								label: "",
								value: parseFloat(self.cell.state.minimumYValue)
							}];
							// also has yRegions, not relevant now
						}
						if (self.cell.state.title) {
							// we now do the title in data common
							// parameters.title = this.$services.page.translate(self.cell.state.title);
						}
						// if we have a label field, use that
						if (this.cell.state.label) {
							parameters.data.labels = this.records.map(function(x) {
								var value = self.$services.page.getValue(x, self.cell.state.label);
								if (self.cell.state.labelFormat) {
									// want to add the state
									var cloned = nabu.utils.objects.clone(self.cell.state.labelFormat);
									cloned.state = x;
									cloned.$value = self.$value;
									value = self.$services.formatter.format(value, cloned);
								}
								return value;
							});
						}
						if (this.cell.state.dataset) {
							var datasets = [];
							datasets.push(this.cell.state.dataset);
							datasets.forEach(function(x) {
								var hasData = false;
								var values = self.records.map(function(y) {
									var value = self.$services.page.getValue(y, x.value);
									if (x.format) {
										value = self.$services.formatter.format(value, x.format);
									}
									if (value != null) {
										hasData = true;
									}
									return value == null ? 0 : value;
								});
								console.log("data is", self.records, values, x.value);
								if (hasData) {
									parameters.data.datasets.push({
										name: self.$services.page.translate(x.name),
										values: values
									});
									parameters.colors.push(x.color ? x.color : self.$services.page.getNameColor(x.name ? x.name : "unnamed" + Math.random()));
								}
							});
						}
						if (this.cell.state.barHeight) {
							parameters.barOptions.height = parseInt(this.cell.state.barHeight);
						}
						if (this.cell.state.barDepth) {
							parameters.barOptions.depth = parseInt(this.cell.state.barDepth);
						}
						if (this.cell.state.navigable) {
							parameters.isNavigable = this.cell.state.navigable;
						}
						if (this.cell.state.maxSlices) {
							parameters.maxSlices = parseInt(this.cell.state.maxSlices);
						}
						if (this.cell.state.height) {
							parameters.height = parseInt(this.cell.state.height);
						}
						console.log("drawing", this.$refs.chart, parameters);
						var chart = new frappe.Chart(this.$refs.chart, parameters);
		//				chart.export();
						// update the entire data set (only data? not settings etc)
		//				chart.update(data);
					}
				}
			},
			watch: {
				'records': function() {
					this.draw();	
				},
				definition: function(definition) {
					if (definition) {
						if (!this.cell.state.type) {
							this.cell.state.type = "pie";
						}
						var self = this;
						// we set the label value for each field
						if (!this.cell.state.label) {
							Object.keys(definition).forEach(function(key) {
								if (!self.cell.state.label && (definition[key].type == "string" || !definition[key].type)) {
									self.cell.state.label = key;
								}
							});
						}
						Object.keys(definition).forEach(function(key) {
							if (definition[key].type == "number" || definition[key].format == "int32" || definition[key].format == "int64" || !definition[key].type) {
								var dataset = self.cell.state.dataset;
								dataset.value = key;
								dataset.name = key;
							}
						});
						this.load().then(this.draw);
					}
				}
			}
		});
	}
	
	frappeChartGenerator("frappe-chart");
	frappeChartGenerator("frappe-chart-configure");
	frappeAggregateChartGenerator("frappe-aggregate-chart");
	frappeAggregateChartGenerator("frappe-aggregate-chart-configure");
	
	application.bootstrap(function($services) {
		var accept = function(type, value) {
			if (type == "operation") {
				return $services.dataUtils.getDataOperations().map(function(x) { return x.id }).indexOf(value) >= 0;
			}
		};
		var initialize = function(type, value, component, cell, row, page) {
			component.updateOperation(value);
			var name = $services.page.guessNameFromOperation(value);
			if (name != null) {
				cell.state.title = $services.page.prettify(name);
			}
			// increase the default limit, 10 is not enough when drawing graphs
			cell.state.limit = 1000;
			// set the default filter
			cell.state.filterType = "data-combo-filter";
			cell.state.comboFilter = {
				useTags: true
			}
		};
		
		
		$services.router.register({
			alias: "frappe-chart",
			category: "Charts",
			name: "Frappe Chart",
			description: "Use this versatile frappe plugin to draw bar and line charts.",
			icon: "images/components/frappe-logo.png",
			accept: accept,
			initialize: initialize,
			enter: function(parameters) {
				var component = Vue.component("frappe-chart");
				return new component({propsData:parameters});
			},
			slow: true
		});
		
		$services.router.register({
			alias: "frappe-aggregate-chart",
			category: "Charts",
			name: "Frappe Aggregate Chart",
			description: "Use this versatile frappe plugin to pie, donut and percent charts.",
			icon: "images/components/frappe-logo.png",
			accept: accept,
			initialize: initialize,
			enter: function(parameters) {
				var component = Vue.component("frappe-aggregate-chart");
				return new component({propsData:parameters});
			},
			slow: true
		});
		
	});
});





