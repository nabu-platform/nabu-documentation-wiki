Vue.component("page-form-input-validate-custom-configure", {
	template: "<div><custom-validator-edit :page='page' :cell='cellClone'/><div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		}
	},
	computed: {
		cellClone: function() {
			var cellClone = nabu.utils.objects.clone(this.cell);
			cellClone.state = this.field;
			return cellClone;
		}
	}
})


Vue.component("page-form-input-validate-custom", {
	template: "<div><custom-validator :cell='cellClone' :page='page' /></div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		}
	},
	computed: {
		cellClone: function() {
			var cellClone = nabu.utils.objects.clone(this.cell);
			cellClone.state = this.field;
			return cellClone;
		}
	}	
});
