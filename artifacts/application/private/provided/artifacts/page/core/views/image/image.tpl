<template id="page-image">
	<div class="page-image">
		<n-sidebar v-if="configuring" @close="configuring = false" class="settings" :inline="true">
			<n-form class="layout2">
				<n-form-section>
					<n-collapsible title="Image Settings">
						<n-form-text v-model="cell.state.href" v-if="false" label="Link"/>
						<n-form-text v-model="cell.state.title" label="Title"/>
						<n-form-text v-model="cell.state.height" label="Height"/>
						<n-form-text v-model="cell.state.imagePath" label="Image Path"/>
						<n-form-switch v-model="cell.state.absolute" label="Absolute" v-if="!cell.state.inline"/>
						<n-form-combo v-model="cell.state.size" label="Sizing"
							:nillable="false"
							:items="['cover', 'contain', 'native']"/>
						<n-form-switch v-model="cell.state.inline" label="Inline Rendering"/>
					</n-collapsible>
					<n-collapsible title="Image Content" class="images">
						<n-input-file v-model="files" @change="upload" :types="['image']"/>
						<div class="image-container" v-for="image in images" :class="{'selected': image.relativePath == cell.state.href }" @click="cell.state.href = image.relativePath">
							<div class="image"
								:title="image.path"
								:style="{'background-image': 'url(${server.root()}' + image.relativePath + ')', height: '10rem', 'background-size': 'cover', width:'15rem' }"></div>
							<span v-if="false">{{image.path}}</span>
						</div>
					</n-collapsible>
				</n-form-section>
			</n-form>
		</n-sidebar>
		<div ref="inline" v-content="inlineContent" v-if="cell.state.inline" class="image" 
			:style="{'height': cell.state.height ? cell.state.height : 'inherit'}"
			:title="cell.state.title"></div>
		<img v-else-if="cell.state.size == 'native' && (cell.state.href || href)" :src="fullHref"
			:style="{'height': cell.state.height ? cell.state.height : 'inherit'}"
			:title="cell.state.title"/>
		<div v-else-if="cell.state.href || href" class="image" 
			:style="{'background-image': 'url(' + fullHref + ')', 'height': cell.state.height ? cell.state.height : 'inherit', 'background-size': cell.state.size }"
			:title="cell.state.title"></div>
		<n-input-file v-else-if="edit" v-model="files" @change="upload" :types="['image']"/>
	</div>
</template>