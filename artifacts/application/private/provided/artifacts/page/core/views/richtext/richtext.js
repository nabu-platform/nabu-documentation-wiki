if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.richtext = function(name) {
	return Vue.component(name, {
		template: "#" + name,
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
			},
			localState: {
				type: Object,
				required: false
			}
		},
		created: function() {
			this.normalize(this.cell.state);
		},
		data: function() {
			return {
				configuring: false,
				state: {}
			}
		},
		methods: {
			configurator: function() {
				return "page-richtext-configure";
			},
			normalize: function(state) {
				if (!state.content) {
					Vue.set(state, "content", null);
				}
			},
			highlight: function(content) {
				var highlighter = nabu.page.providers("page-format").filter(function(x) {
					 return x.name == "highlight";
				})[0];
				return highlighter ? highlighter.format(content) : content;
			},
			lorem: function() {
				return "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
			}
		}
	});
};
nabu.page.richtext("page-richtext");
nabu.page.richtext("page-richtext-configure");