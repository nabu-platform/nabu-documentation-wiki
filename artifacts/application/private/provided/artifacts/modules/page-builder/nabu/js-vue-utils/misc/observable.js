if (!nabu) { var nabu = {} }
if (!nabu.utils) { nabu.utils = {} }
if (!nabu.utils.vue) { nabu.utils.vue = {} }

nabu.utils.vue.transform = function(object, format, parse) {
	if (!object.__ob__) {
		throw "The object is not observable, use 'Vue.observe(object, true)' first";
	}
	var result = {
		state: {}
	};
	Vue.observe(result, true);
	nabu.utils.objects.merge(result.state, format(object));
	object.__ob__.dep.addSub({
		update: function() {
			console.log("updating original object", object);
			if (result instanceof Object) {
				nabu.utils.objects.merge(result.state, format(object));
			}
			else {
				result = format(object);
			}
		}
	});
	result.__ob__.dep.addSub({
		update: function() {
			console.log("updating target object", result);
			if (object instanceof Object) {
				nabu.utils.objects.merge(object, parse(result.state));
			}
			else {
				object = parse(result.state);
			}
		}
	});
	return result.state;
}

Vue.mixin({
	methods: {
		$transform: nabu.utils.vue.transform
	}
});