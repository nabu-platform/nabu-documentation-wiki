nabu.services.VueService(Vue.extend({
	data: function() {
		return {
			timer: null,
			width: 0,
			height: 0
		}
	},
	created: function() {
		this.update();
		var self = this;
		window.addEventListener("resize", function(event) {
			if (this.timer) {
				window.clearTimeout(this.timer);
			}
			// recalculate everything in 100ms
			this.timer = setTimeout(function() { self.update() }, 100);
		});
	},
	methods: {
		update: function() {
			// https://stackoverflow.com/questions/1248081/get-the-browser-viewport-dimensions-with-javascript
			this.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
			this.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
		}
	}
}), { name: "nabu.page.services.Resizer" });