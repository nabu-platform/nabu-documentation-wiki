<template id="page-renderer-slider">
	<div class="page-renderer-slider">
		<div class="buttons">
			<button @click="previous">Previous</button>
			<button @click="next">Next</button>
		</div>
		<transition-group :name="group" :tag="tag ? tag : 'div'" class="items">
			<slot></slot>
		</transition-group>
	</div>
</template>