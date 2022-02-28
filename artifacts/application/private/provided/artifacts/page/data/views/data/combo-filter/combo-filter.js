Vue.component("data-combo-filter", {
	template: "#data-combo-filter",
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
			required: false
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
			activeFilter: null,
			showLabels: false
		}
	},
	computed: {
		tags: function() {
			var self = this;
			var alreadyAdded = [];
			return this.filters.filter(function(filter) {
				if (self.state[filter.name] == null) {
					return false;
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
	created: function() {
		this.activeFilter = this.filters[0];
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
			// if we get a label with the value "null" but the value is still here, the label is being reset for other reasons
			if (label != null || this.state[filter.name] == null) {
				Vue.set(this.state, filter.name + "$label", label);
			}
		}
	}
})

Vue.component("data-combo-filter-configure", {
	template: "#data-combo-filter-configure",
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
		}
	},
	created: function() {
		if (!this.cell.state.comboFilter) {
			Vue.set(this.cell.state, "comboFilter", {});
		}
	}
})