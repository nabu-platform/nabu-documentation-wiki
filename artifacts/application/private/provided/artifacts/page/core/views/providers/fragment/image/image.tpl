<template id="page-field-fragment-image-configure">
	<n-form-section>
		<n-form-switch v-model="fragment.dataUrl" label="Is data url" v-if="!fragment.operationParameter" info="If the content in the record is actually a blob or base64 encoded byte array, check this"/>
		<n-form-switch v-model="fragment.operationParameter" label="Is operation parameter" v-if="!fragment.dataUrl" info="If you need have an operation that returns the byte stream based on parameters, use this"/>
		<n-form-switch v-model="fragment.fixedHref" label="Is href fixed?" info="If you have a fixed href, use this"/>
		<n-form-combo v-if="!fragment.fixedHref && !fragment.dataUrl && !fragment.operationParameter" :items="keys" :label="fragment.dataUrl ? 'Data url field' : 'Image Href'" v-model="fragment.imageHref"/>
		<n-form-text v-else-if="!fragment.dataUrl && !fragment.operationParameter" v-model="fragment.imageHref" label="Image Href"/>
		<n-form-text v-model="fragment.imageTitle" label="Image Title"/>
		<n-form-text v-model="fragment.imageHeight" label="Image Height"/>
		<n-form-combo v-model="fragment.imageSize" label="Image Sizing"
			:nillable="false"
			:items="['cover', 'contain']"/>
		<n-form-combo v-if="fragment.dataUrl" v-model="fragment.contentType" label="Content type" :items="keys"/>
		<n-form-combo v-if="fragment.operationParameter" v-model="fragment.operation" :filter="getOperations" label="Operation" :formatter="function(x) { return x.id }" :extracter="function(x) { return x.id }"/>
		<n-page-mapper v-if="fragment.operation && fragment.operationParameter" :to="getOperationParameters(fragment.operation)"
			:from="getAvailableParameters()" 
			v-model="fragment.bindings"/>
	</n-form-section>
</template>
