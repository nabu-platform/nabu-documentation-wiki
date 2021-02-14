Vue.component("page-event-value", {
	template: "#page-event-value",
	props: {
		container: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		title: {
			type: String,
			required: false,
			default: "Event"
		},
		name: {
			type: String,
			required: false,
			default: "genericEvent"
		},
		inline: {
			type: Boolean,
			required: false
		}
	},
	created: function() {
		// built in some (minor) backwards compatibility
		if (typeof(this.container[this.name]) == "string") {
			Vue.set(this.container, this.name, {
				eventFields: [{name: "value", isFixed: false, fixedValue: null, stateValue: null}],
				name: this.container[this.name]
			});
		}
		else if (!this.container[this.name]) {
			Vue.set(this.container, this.name, {
				eventFields: [],
				name: null
			});
		}
	},
	methods: {
		addEventField: function(target) {
			if (!target.eventFields) {
				Vue.set(target, "eventFields", []);
			}
			target.eventFields.push({name:null,fixedValue:null,isFixed:false,stateValue:null});
		}
	}
});

if (!nabu) { var nabu = {}; }
if (!nabu.page) { nabu.page = {}; }
if (!nabu.page.event) { nabu.page.event = {}; }

nabu.page.event = {
	getType: function(container, name) {
		var result = {};
		if (container[name] && container[name].eventFields) {
			container[name].eventFields.forEach(function(x) {
				result[x.name] = {
					type: "string"
				};
			});
		}
		return {properties:result};
	},
	getName: function(container, name) {
		return container[name] ? (typeof(container[name]) == "string" ? container[name] : container[name].name) : null;	
	},
	getInstance: function(container, name, page, component) {
		var pageInstance = application.services.page.getPageInstance(page, component);
		var result = {};
		// backwards compatibility
		if (typeof(container[name]) == "string") {
			// backwards compatibility with page click events
			if (name == "clickEvent") {
				if (container.hasFixedClickValue && container.clickEventValue) {
					result.value = container.clickEventValue;
				}
				else if (container.clickEventValue) {
					result.value = application.services.page.getBindingValue(pageInstance, container.clickEventValue);
				}
			}
			// actions backwards compatibility
			else if (container.hasFixedState && container.eventFixedState) {
				result.value = application.services.page.interpret(container.eventFixedState, component);
			}
			// actions backwards compatibility
			else if (container.eventState) {
				result.value = pageInstance.get(container.eventState);
			}
		}
		else if (container[name] && container[name].eventFields) {
			container[name].eventFields.forEach(function(x) {
				if (x.isFixed) {
					result[x.name] = application.services.page.interpret(x.fixedValue, component);
				}
				else {
					result[x.name] = application.services.page.getBindingValue(pageInstance, x.stateValue);
				}
			});
		}
		return result;
	}
}