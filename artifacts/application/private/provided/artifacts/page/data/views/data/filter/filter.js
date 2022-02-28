Vue.component("data-filter-default", {
	template: "#data-filter-default",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		showRefresh: {
			type: Boolean, 
			required: false
		},
		showClear: {
			type: Boolean, 
			default: false
		},		
		orderable: {
			type: Boolean,
			required: false
		},
		filters: {
			type: Array,
			required: true
		},
		state: {
			type: Object,
			required: false,
			default: function() { return {} }
		}
	},
	data: function() {
		return {
			showFilter: false,
			showLabels: false
		}
	},
	created: function () {
		if (!this.cell.state.defaultFilter) {
			Vue.set(this.cell.state, "defaultFilter", {});
		}
		if ( this.cell.state.defaultFilter.displayOpenOnly == true) {
			this.showFilter = true;
		}
	},
	computed: {
		tags: function() {
			var self = this;
			var alreadyAdded = [];
			return this.filters.filter(function(filter) {
				var value = self.state[filter.name];
				// never show empty
				if (value == null) {
					return false;
				}
				// if not empty, we might not want to show some values
				if (self.cell.state.defaultFilter.hideBooleanTags) {
					if (value == true || value == false || value == "true" || value == "false") {
						return false;
					}
				}
				if (alreadyAdded.indexOf(filter.name) >= 0) {
					return false;
				}
				else {
					alreadyAdded.push(filter.name);
				}
				return true;
			}).map(function(filter) {
				return {
					filter: filter,
					value: self.state[filter.name + "$label"] ? self.state[filter.name + "$label"] : self.state[filter.name],
					remove: function() {
						self.setFilter(filter, null);
					}
				}
			});
		}
	},	
	methods: {
		isHidden: function(field) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance && !!field.hidden && this.$services.page.isCondition(field.hidden, pageInstance.variables, this);
		},
		isDisabled: function(field) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance && !!field.disabled && this.$services.page.isCondition(field.disabled, pageInstance, this);
		},
		filter: function(value, label) {
			
		},
		setFilter: function(filter, newValue) {
			// set locally
			Vue.set(this.state, filter.name, newValue);
			// broadcast to parent
			this.$emit('filter', filter, newValue);
		},
		setLabel: function(filter, label) {
			
			console.log("setFilter", filter, label);
			// if we get a label with the value "null" but the value is still here, the label is being reset for other reasons
			if (label != null || this.state[filter.name] == null) {
				Vue.set(this.state, filter.name + "$label", label);
			}
		}
	}
})

Vue.component("data-default-filter-configure", {
	template: "#data-default-filter-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		filters: {
			type: Array,
			required: true
		},
		showClear: {
			type: Boolean, 
			default: false
		}
	},	
	created: function () {
		if (!this.cell.state.defaultFilter) {
			Vue.set(this.cell.state, "defaultFilter", {});
		}
	}
})