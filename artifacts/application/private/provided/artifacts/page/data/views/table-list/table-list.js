if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }
if (!nabu.page.views.data) { nabu.page.views.data = {} }

nabu.page.views.data.TableListGenerator = function(name) { return Vue.component(name, {
	mixins: [nabu.page.views.data.DataCommon],
	template: "#" + name,
	data: function() {
		return {
			configuring: false,
			hiddenColNames: []
		}
	},
	activate: function(done) {
		var self = this;
		var event = null;
		// we capture the value of the event before any watchers can trigger and clear it...
		if (self.cell.state.batchSelectionColumn != null && self.cell.state.batchSelectionEvent != null && self.cell.state.batchSelectionEventLoad) {
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			event = pageInstance.get(self.cell.state.batchSelectionEvent);
		}
		this.activate(function() {
			if (event instanceof Array) {
				// we need to trigger after the watcher below that clears both the selected array _and_ the event!
				setTimeout(function() {
					self.loadSelected(event);
					self.emitBatchSelection();
				}, 1)
			}
			done();
		});
	},
	created: function() {
		this.create();
	},
	watch: {
		"records": function() {
			// if we change the records, reset the selected
			// we especially need to clear the event!
			// the data component should be wiping the selected already...?
			this.clearAllSelected();		
		}
	},
	methods: {
		isShowBatchSelection: function(record) {
			if (this.cell.state.batchSelectionCondition) {
				return this.$services.page.isCondition(this.cell.state.batchSelectionCondition, record, this);
			}
			return true;
		},
		// deselect all in case of reload
		clearAllSelected: function() {
			this.selected.splice(0);
			this.emitBatchSelection();
		},
		selectAll: function() {
			// if we have no condition, it is all or nothing
			if (!this.cell.state.batchSelectionCondition) {
				// if everything is selected, deselect everything
				if (this.allSelected) {
					this.selected.splice(0);
					this.emitBatchSelection();
				}
				else {
					var self = this;
					var lastAdded = null;
					this.records.forEach(function(x) {
						if (self.selected.indexOf(x) < 0) {
							self.selected.push(x);
							lastAdded = x;
						}
					});
					if (lastAdded) {
						this.emitBatchSelection();
					}
					// TODO: should emit the single select as well for the last one?
				}
			}
			else {
				var self = this;
				var available = this.records.filter(function(x) {
					return self.$services.page.isCondition(self.cell.state.batchSelectionCondition, x, self);
				});
				// if we have selected all the possible ones, we assume deselect
				if (this.selected.length == available.length) {
					this.selected.splice(0);
					this.emitBatchSelection();
				}
				else {
					var lastAdded = null;
					available.forEach(function(x) {
						if (self.selected.indexOf(x) < 0) {
							self.selected.push(x);
							lastAdded = x;
						}
					});
					if (lastAdded) {
						this.emitBatchSelection();
					}
				}
			}
		},
		selectBatch: function(record) {
			var field = this.cell.state.fields[this.cell.state.batchSelectionColumn];
			if (field) {
				var rowspan = this.calculateRowspan(field, record);
				var index = this.records.indexOf(record);
				// not the record itself, it is already added by the checkbox
				for (var i = 1; i < rowspan; i++) {
					// we skip the trigger for all but the last
					// the first one does not trigger the select either because the selection array is directly manipulated by the checkbox _without_ the selection event
					this.select(this.records[index + i], i != rowspan - 1);
				}
				if (this.cell.state.batchSelectionAmount && this.selected.length > parseInt(this.cell.state.batchSelectionAmount)) {
					// we splice as many as needed to reach the goal
					this.selected.splice(0, this.selected.length - parseInt(this.cell.state.batchSelectionAmount))
				}
				this.emitBatchSelection();
			}
		},
		emitBatchSelection: function() {
			if (this.cell.state.batchSelectionEvent) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				pageInstance.emit(this.cell.state.batchSelectionEvent, this.selected);
			}
		},
		unselectBatch: function(record) {
			var field = this.cell.state.fields[this.cell.state.batchSelectionColumn];
			if (field) {
				var rowspan = this.calculateRowspan(field, record);
				var index = this.records.indexOf(record);
				// not the record itself, it is already added by the checkbox
				for (var i = 1; i < rowspan; i++) {
					var selectionIndex = this.selected.indexOf(this.records[index + i]);
					if (selectionIndex >= 0) {
						this.selected.splice(selectionIndex, 1, i != rowspan - 1);
					}
				}
				this.emitBatchSelection();
			}
		},
		getCustomEvents: function() {
			var events = {};
			if (this.cell.state.multiselect && this.cell.state.batchSelectionEvent) {
				events[this.cell.state.batchSelectionEvent] = {type: "array", items: {properties: this.definition, type: "object"}};
			}
			console.log("custom events are", events);
			return events;
		},
		updateMultiSelect: function(index) {
			this.cell.state.multiselect = index != null;
			console.log("multiselect is", this.cell.state.multiselect);
		},
		calculateRowspan: function(field, record) {
			// no rowspan at all, return 1
			if (!this.cell.state.rowGroups || this.cell.state.rowGroups.length == 0) {
				return 1;
			}
			// the index of the field
			var index = this.cell.state.fields.indexOf(field);
			var grouping = this.cell.state.rowGroups.filter(function(x) { return x.fieldIndex == index })[0];
			// if we are not grouping on this field or it is not fully configured, nobody cares
			if (!grouping || !grouping.fieldName) {
				return 1;
			}
			// if we are grouping this field, we need to get the value in the current field
			var current = this.$services.page.getValue(record, grouping.fieldName);
			var recordIndex = this.records.indexOf(record);
			// if we are not the first record, check if the previous record has the same value
			if (recordIndex > 0) {
				// if we don't allow for subgrouping on this record, we can just check the previous record
				// if it has the same value, we don't want to show this
				if (!grouping.subGroup) {
					var previousRecord = this.records[recordIndex - 1];
					var previous = this.$services.page.getValue(previousRecord, grouping.fieldName);
					// if we have the same value as the previous, we don't want to show this
					if (previous == current) {
						return -1;
					}
				}
				// if we allow for subgrouping, just the fact that the previous record has the same value is not enough
				// it might have the same value but still be restricted by a parent group
				else {
					for (var j = 0; j < recordIndex; j++) {
						var window = this.findRowGroupSizeForGroup(grouping, j);
						if (window > 1) {
							// we always increment with 1 in the loop itself, so if we have a window beyond 1, increment with that
							j += window - 1;
						}
					}
					// if we jumped onto or beyond the record index, this value is contained in a previous grouping
					if (j > recordIndex) {
						return -1;
					}
				}
			}
			// if we get here, we are row grouping and we are the first of our kind, check how far it goes
			return this.findRowGroupSize(field, recordIndex);
		},
		findRowGroupSize: function(field, recordIndex) {
			var index = this.cell.state.fields.indexOf(field);
			var grouping = this.cell.state.rowGroups.filter(function(x) { return x.fieldIndex == index })[0];
			if (!grouping || !grouping.fieldName) {
				return 1;
			}
			return this.findRowGroupSizeForGroup(grouping, recordIndex);
		},
		findRowGroupSizeForGroup: function(grouping, recordIndex) {
			var last = null;
			for (var i = recordIndex; i < this.records.length; i++) {
				var current = this.$services.page.getValue(this.records[i], grouping.fieldName);
				if (i == recordIndex) {
					last = current;
				}
				// we have reached the end!
				else if (last != current) {
					break;
				}
			}
			// suppose we have [a, b, b, b, c, d] and looking from recordIndex 1
			// i will be at "c" (position 4) by the time the loop breaks
			// if we return 4 - 1, we get the size of the group: 3
			var result = i - recordIndex;
			// if it is a subgroup -> we can't go beyond parent group
			if (grouping.subGroup) {
				var groupIndex = this.cell.state.rowGroups.indexOf(grouping);
				if (groupIndex > 0) {
					var limiter = this.findRowGroupSizeForGroup(this.cell.state.rowGroups[groupIndex - 1], recordIndex);
					if (limiter > 0) {
						result = Math.min(result, limiter);
					}
				}
			}
			return result;
		},
		addGroupingField: function() {
			if (!this.cell.state.rowGroups) {
				Vue.set(this.cell.state, "rowGroups", []);
			}
			this.cell.state.rowGroups.push({
				fieldIndex: 0,
				fieldName: null,
				subGroup: false
			});
		},
		addDevice: function(field) {
			if (!field.devices) {
				Vue.set(field, "devices", []);
			}
			field.devices.push({name: null, operator: '>='});
		},
		isAllowedDevice: function(field) {
			return !field.devices || field.devices.length == 0 || this.$services.page.isDevice(field.devices);
		},
		configure: function() {
			this.configuring = true;
		},
		configurator: function() {
			return "data-table-list-configure"
		},
		addTopHeaderField: function() {
			if (!this.cell.state.topHeaders) {
				Vue.set(this.cell.state, "topHeaders", []);
			}
			this.cell.state.topHeaders.push({
				label: null,
				subheaders: [],
				colspan: null,
				styles: []
			});
		},
		addSubheader: function(field) {
			field.subheaders.push(null);
		},
		addStyle: function(field) {
			field.styles.push({
				class: null,
				condition: null
			});
		},
		fieldUp: function(field) {
			var index = this.cell.state.topHeaders.indexOf(field);
			if (index > 0) {
				var replacement = this.cell.state.topHeaders[index - 1];
				this.cell.state.topHeaders.splice(index - 1, 1, field);
				this.cell.state.topHeaders.splice(index, 1, replacement);
			}
		},
		fieldDown: function(field) {
			var index = this.cell.state.topHeaders.indexOf(field);
			if (index < this.cell.state.topHeaders.length - 1) {
				var replacement = this.cell.state.topHeaders[index + 1];
				this.cell.state.topHeaders.splice(index + 1, 1, field);
				this.cell.state.topHeaders.splice(index, 1, replacement);
			}
		},
		fieldBeginning: function(field) {
			var index = this.cell.state.topHeaders.indexOf(field);
			if (index > 0) {
				this.cell.state.topHeaders.splice(index, 1);
				this.cell.state.topHeaders.unshift(field);
			}
		},
		fieldEnd: function(field) {
			var index = this.cell.state.topHeaders.indexOf(field);
			if (index < this.cell.state.topHeaders.length - 1) {
				this.cell.state.topHeaders.splice(index, 1);
				this.cell.state.topHeaders.push(field);
			}
		},
		calculateColspan: function(field) {
			var self = this;
			if (field.subheaders != null && this.cell.state.hideEmptyColumns) {
				var result = field.subheaders.filter(function(subheader) {
					return !self.isAllFieldHidden(self.cell.state.fields[subheader]) && self.isAllowedDevice(self.cell.state.fields[subheader]);
				});
				field.colspan = result.length;
			}
			else if (field.subheaders != null) {
				field.colspan = field.subheaders.length;
			}
			else {
				field.colspan = 1;	
			}
			return field.colspan
		},
		subheadersHidden: function(field) {
			var self = this;
			if (field.subheaders != null && field.subheaders.length > 1) {
				var result = field.subheaders.filter(function(subheader) {
					return !self.isAllFieldHidden(self.cell.state.fields[subheader]) && self.isAllowedDevice(self.cell.state.fields[subheader]);
				});
				return result.length == 0;
			}
			else {
				return false;
			}
		}
	}
});}

nabu.page.views.data.TableList = nabu.page.views.data.TableListGenerator("data-table-list");
nabu.page.views.data.TableListGenerator("data-table-list-configure");