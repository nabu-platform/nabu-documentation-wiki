Vue.view("nabu-console", {
	props: {
		initialTab: {
			type: String,
			default: "events"
		}	
	},
	data: function() {
		return {
			selected: null,
			search: null,
			tab: "events"
		}
	},
	computed: {
		enabledFeatures: function() {
			var self = this;
			return this.$services.page.availableFeatures.filter(function(x) {
				return self.$services.page.enabledFeatures.indexOf(x.name) >= 0;
			});
		},
		disabledFeatures: function() {
			var self = this;
			return this.$services.page.availableFeatures.filter(function(x) {
				return self.$services.page.enabledFeatures.indexOf(x.name) < 0;
			});
		},
		cleanedUpContent: function() {
			if (!this.$services.page.inspectContent) {
				return "No content to inspect";
			}
			else {
				var depth = 0;
				var content = this.$services.page.inspectContent;
				// remove comments
				content = content.replace(/(<!---->)/g, "");
				var index = content.lastIndexOf("<");
				while (index >= 0) {
					var isClosing = content.substring(index + 1, index + 2) == "/";
					if (!isClosing) {
						depth--;
					}
					var whitespace = "";
					for (var i = 0; i < depth; i++) {
						whitespace += "\t";
					}
					content = content.substring(0, index) + whitespace + "&lt;" + content.substring(index + 1);
					// closing tag
					// because we loop in reverse, we need to do depth the other way around
					if (isClosing) {
						depth++;
					}
					index = content.lastIndexOf("<");
				}
				// if we have a tag that contains no other tags, we don't do a linefeed
				content = content.replace(/(&lt;[^/>]*)>[\s]*([^>]+?)[\s]*(&lt;\/)/g, "$1&gt;$2$3");
				content = content.replace(/>/g, "&gt;\n");
				// highlighting
				content = content.replace(/(&lt;.*?&gt;)/g, "<span class='console-highlight-tag'>$1</span>");
				return content;
			}
		}
	},
	created: function() {
		this.tab = this.initialTab;
	},
	methods: {
		isHidden: function(report) {
			if (!this.search) {
				return false;
			}
			else {
				var self = this;
				var matches = function(string) {
					return string && string.toLowerCase().match(new RegExp(self.search.replace("*", ".*"), "mi"));
				}
				var match = matches(report.source)
					|| matches(report.type)
					|| matches(JSON.stringify(report.properties));
				return !match;
			}
		},
		resetFeatures: function() {
			// we update the enabled features array in page builder
			this.$services.page.enabledFeatures.splice(0);
			// remerge the standard enabled features
			nabu.utils.arrays.merge(
				this.$services.page.enabledFeatures, 
				this.$services.page.availableFeatures.filter(function(x) { return x.enabled }).map(function(x) { return x.name })
			);
			// clean up the toggled features
			this.$services.page.toggledFeatures.splice(0);
			if (this.$services.swagger.toggledFeatures) {
				this.$services.swagger.toggledFeatures.splice(0);	
			}
		},
		enableFeature: function(feature) {
			// we need to check if it is enabled by default
			var available = this.$services.page.availableFeatures.filter(function(x) { return x.name == feature.name })[0];
			var toggled = this.$services.page.toggledFeatures.filter(function(x) { return x.name == feature.name })[0];
			// remove any toggled features
			if (toggled) {
				this.$services.page.toggledFeatures.splice(this.$services.page.toggledFeatures.indexOf(toggled), 1);
			}
			// make sure it is in the list of enabled features
			this.$services.page.enabledFeatures.push(available.name);
			// we only need to do something special (add it to toggled) if it is not enabled by default
			if (available && !available.enabled) {
				this.$services.page.toggledFeatures.push({
					name: feature.name,
					description: feature.description,
					enabled: true
				});
			}
			// synchronize swagger
			if (this.$services.swagger.toggledFeatures) {
				this.$services.swagger.toggledFeatures.splice(0);
				nabu.utils.arrays.merge(this.$services.swagger.toggledFeatures, this.$services.page.toggledFeatures);
			}
		},
		disableFeature: function(feature) {
			// we need to check if it is enabled by default
			var available = this.$services.page.availableFeatures.filter(function(x) { return x.name == feature.name })[0];
			var toggled = this.$services.page.toggledFeatures.filter(function(x) { return x.name == feature.name })[0];
			// remove any toggled features
			if (toggled) {
				this.$services.page.toggledFeatures.splice(this.$services.page.toggledFeatures.indexOf(toggled), 1);
			}
			var index = this.$services.page.enabledFeatures.indexOf(available.name);
			if (index >= 0) {
				this.$services.page.enabledFeatures.splice(index, 1);
			}
			// we only need to do something special (add it to toggled) if it is not enabled by default
			if (available && available.enabled) {
				this.$services.page.toggledFeatures.push({
					name: feature.name,
					description: feature.description,
					enabled: false
				});
			}
			// synchronize swagger
			if (this.$services.swagger.toggledFeatures) {
				this.$services.swagger.toggledFeatures.splice(0);
				nabu.utils.arrays.merge(this.$services.swagger.toggledFeatures, this.$services.page.toggledFeatures);
			}
		}
	}
});