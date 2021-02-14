<template id="page-video">
	<div class="page-video">
		<n-sidebar v-if="configuring" @close="configuring = false" class="settings" :inline="true">
			<n-form class="layout2">
				<n-form-section>
					<n-collapsible title="Video Settings">
						<n-form-text v-model="cell.state.title" label="Title"/>
						<n-form-text v-model="cell.state.height" label="Height"/>
						<n-form-text v-model="cell.state.videoPath" label="Video Path"/>
						<n-form-switch v-model="cell.state.absolute" label="Absolute"/>
						<n-form-switch v-model="cell.state.muted" label="Muted"/>
						<n-form-switch v-model="cell.state.controls" label="Controls"/>
						<n-form-switch v-model="cell.state.loop" label="Loop"/>
						<n-form-switch v-model="cell.state.autoplay" label="Autoplay"/>
						<n-form-text v-model='cell.state.fallbackUrl' label='Fallback Image Url'/>
					</n-collapsible>
					<n-collapsible title="Video Content" class="images">
						<n-input-file v-model="files" @change="upload" :types="['video']"/>
						<div class="image-container" v-for="image in images" :class="{'selected': image.relativePath == cell.state.href }" @click="cell.state.href = image.relativePath">
							<video :src="'${server.root()}' + image.relativePath"/>
						</div>
					</n-collapsible>
				</n-form-section>
			</n-form>
		</n-sidebar>
		
		<video v-if="fullHref" :autoplay="cell.state.autoplay" :loop="cell.state.loop" preload="" :muted="cell.state.muted" class="video" :controls="cell.state.controls">
			<source :src="fullHref">
			<img v-if="cell.state.fallbackUrl" :src="cell.state.fallbackUrl" alt="Your browser does not support this video type">
		</video>
		
		<n-input-file v-else-if="edit" v-model="files" @change="upload" :types="['video']"/>
	</div>
</template>