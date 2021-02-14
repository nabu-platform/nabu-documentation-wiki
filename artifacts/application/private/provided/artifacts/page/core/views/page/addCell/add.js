if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.PageAddCell = Vue.extend({
	template: "#page-add-cell",
	props: {
		page: {
			type: Object,
			required: true
		}
	},
	data: function() {
		return {
			route: null,
			bindings: {},
			target: 'page',
			on: null
		}
	},
	computed: {
		availableEvents: function() {
			var available = nabu.utils.objects.clone(this.$services.page.instances[this.page.name].getEvents());
			return Object.keys(available);
		},
		parameters: function() {
			return this.route ? this.$services.page.getRouteParameters(this.route) : [];
		},
		availableParameters: function() {
			// there are all the events
			var available = nabu.utils.objects.clone(this.$services.page.instances[this.page.name].getEvents());
			var result = {};
			if (this.on) {
				result[this.on] = available[this.on];
			}
			// and the page
			result.page = this.$services.page.getPageParameters(this.page);
			return result;
		}
	},
	methods: {
		filterRoutes: function(value) {
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes;
		},
		set: function() {
			this.$resolve({
				alias: this.route.alias,
				bindings: this.bindings,
				target: this.on ? this.target : 'page',
				on: this.on
			})
		}
	}
})