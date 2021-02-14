<template id="page-field-fragment-image-configure">
	<n-form-section>
		<n-form-switch v-model="fragment.fixedHref" label="Is href fixed?"/>
		<n-form-combo v-if="!fragment.fixedHref" :items="keys" label="Image Href" v-model="fragment.imageHref"/>
		<n-form-text v-else v-model="fragment.imageHref" label="Image Href"/>
		<n-form-text v-model="fragment.imageTitle" label="Image Title"/>
		<n-form-text v-model="fragment.imageHeight" label="Image Height"/>
		<n-form-combo v-model="fragment.imageSize" label="Image Sizing"
			:nillable="false"
			:items="['cover', 'contain']"/>
	</n-form-section>
</template>
