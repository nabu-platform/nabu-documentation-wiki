// this directive takes a header (presumed at the top of the page) and will slide it away when you scroll down
// the first time you scroll up however, the menu pops back up
Vue.directive("sticky-header", {
	bind: function(element, binding) {
		element.setAttribute("n-sticky-header", "true");
		var previousScrollTop = document.body.scrollTop;
		var height = element.getBoundingClientRect().height;
		element["$n-sticky-header-listener"] = function(event) {
			if (height == 0) {
				height = element.getBoundingClientRect().height;
			}
			// at initial position or scrolling upwards, show the menu
			if (document.body.scrollTop <= height || document.body.scrollTop < previousScrollTop) {
				element.style.top = "0px";
			}
			else {
				element.style.top = "-" + (binding.value ? binding.value : height) + "px";
			}
			previousScrollTop = document.body.scrollTop;
		};
		window.addEventListener("scroll", element["$n-sticky-header-listener"]);
	},
	unbind: function(element) {
		element.removeAttribute("n-sticky-header");
		if (element["$n-sticky-header-listener"]) {
			console.log("Removing event listener");
			window.removeEventListener("scroll", element["$n-sticky-header-listener"]);
		}
	}
});