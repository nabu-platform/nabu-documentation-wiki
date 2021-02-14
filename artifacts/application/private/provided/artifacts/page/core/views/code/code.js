if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.Code = Vue.extend({
	template: "#page-code",
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
		configure: function() {
			this.configuring = true;	
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
		}
	}
})