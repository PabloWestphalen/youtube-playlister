var ytPlayer;
var currentVideo;
var videoData;
var playlist = {
	videos: [],
	currentVideo: 0
};

var Keys = {
	ENTER: 13
}

var cachedVideos = {};
var initialVideos = ["R8RnMK06EmM", "qRs0MrfDhmw"];

$(document).ready(function() {
	init();
});

function init() {
	loadYoutube();
	addEvents();
}

function addEvents() {
	$(".sortable").sortable({
		start: function(event, ui) {
	        $(this).attr("data-previndex", ui.item.index());
	    },
	    update: function(event, ui) {
	    	var newIndex = ui.item.index();
	    	var oldIndex = $(this).attr("data-previndex");
	        $(this).removeAttr("data-previndex");
	        playlist.videos.move(oldIndex, newIndex);
	        playlist.currentVideo = newIndex;
		},
		stop: function (e, ui) { reindexPlaylist(); },
		receive: function(e, ui) { sortableIn = 1; },
		over: function(e, ui) { sortableIn = 1; },
		out: function(e, ui) { sortableIn = 0; },
		beforeStop: function(e, ui) {
			if (sortableIn == 0) {
				playlist.videos.splice(ui.item.index(), 1);
				if(ui.item.hasClass("playing-vid")) {
					playVideo(ui.item.index());
				}	
				ui.item.remove();				
			}			
		}
	});

	 $("#search").on("keydown", function(event) {
		if(event.which == Keys.ENTER) {
			$(".now-playing").fadeOut();
			$(".search").addClass("loading");
			doSearch($(this).val());
		}
	});

	$("#search-results").on("click", "li", function() {
		var video = $(this).attr("data-video-id");
		addVideoToPlaylist(video);
	});

	$(".playlist-videos").on("click", "li", function() {
		playVideo($(this).index());
	});

	$("body").on("click", function(event) {
		if(event.target === this) {
			showNowPlaying();
		}
	});
}

function showNowPlaying() {
	$(".search-area").fadeOut();
	$(".now-playing").fadeIn();
}

function doSearch(query) {
	console.log("Looking for: ", query);

	$.getJSON("https://www.googleapis.com/youtube/v3/search", {
		key: "AIzaSyAYjKYfxvjLdWBj20hTjG93hj35LpUsCus",
		part: "id",
		maxResults: 20,
		videoEmbedable: true,
		q: query
	}, function(data) {
		if(data.items.length > 0) {
			var videosArray = data.items.map(function(item) {
 				if(item.id.kind == "youtube#video") {
  					return item.id.videoId
 				}
			}).filter(function(value) {if(value != undefined) return value});

			var searchResults = []

			loadVideos(videosArray, function() {
				videosArray.forEach(function(video) {
					searchResults.push(cachedVideos[video]);
				});
				renderSearchResults(searchResults);
			});
		}
	});
}

function reindexPlaylist() {
	$(".playlist-videos li").each(function(index, video) {
		$(this).find(".playlist-video-index").text(index+1);
	});
}

function renderSearchResults(searchResults) {
	$("#search-results").empty();
	var template = '<li class="cf" data-video-id="<ID>">' + 
							'<img src="<THUMBNAIL>" class="result-thumbnail" />' +
							'<div class="result-info">' +
								'<p><strong class="result-title"><TITLE></strong></p>' +
								'<p><span class="result-channel">by <strong><CHANNEL></strong></span></p>' +
								'<p class="result-meta"><span class="result-publishedAt"><PUBLISHED></span> | <span class="result-views"><VIEWS></span></p>' +
								'<p class="result-description"><DESCRIPTION></p>' +
							'</div>' +
						'</li>';
	var output = "";
	searchResults.forEach(function(result) {
		
		var description = result.snippet.description;
		var description = description.length < 135 ? description : description.substring(0, 135) + " ...";

		output += template
				.replace("<ID>", result.id)
				.replace("<THUMBNAIL>", result.snippet.thumbnails.default.url)
				.replace("<TITLE>", result.snippet.title)
				.replace("<CHANNEL>", result.snippet.channelTitle)
				.replace("<PUBLISHED>", new Date(result.snippet.publishedAt).format("mmm dd, yyyy"))
				.replace("<VIEWS>", result.statistics.viewCount)
				.replace("<DESCRIPTION>", description);
	});

	$("#search-results").append(output);
	$(".search-area").fadeIn();
	$(".search").removeClass("loading");
};

function loadYoutube() {
	var tag = document.createElement('script');
	tag.src = "https://www.youtube.com/iframe_api";
	var firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);	
}

function onYouTubeIframeAPIReady() {
	ytPlayer = new YT.Player('youtube-iframe-player', {
		height: '390',
		width: '640',
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		}
	});
}

function playVideo(index) {
	console.log("playVideo received this index", index, "list currently has ", $(".playlist-videos li").length, "videos");
	currentVideo = playlist.videos[index];
	playlist.currentVideo = index;
	ytPlayer.loadVideoById(currentVideo);
	$(".playing-vid").removeClass("playing-vid");
	$(".playlist-videos li").eq(index).addClass("playing-vid");
	updateVideoData(cachedVideos[currentVideo]);
}

function onPlayerReady(event) {
	loadVideos(initialVideos, function() {
		initialVideos.forEach(addVideoToPlaylist);
		playVideo(0);
		updateVideoData(cachedVideos[currentVideo]);
	});
}

function updateCurrentVideo() {
	currentVideo = ytPlayer.getVideoUrl().split("v=")[1];
}

function onPlayerStateChange(event) {
	if (event.data == YT.PlayerState.PLAYING) {
		$("#youtube-iframe-player").addClass("ready");
	}
	if (event.data == YT.PlayerState.ENDED) {
		if(playlist.currentVideo < playlist.videos.length - 1) {
			currentVideo = playlist.videos[playlist.currentVideo+1];
			playlist.currentVideo += 1;
			playVideo(playlist.currentVideo);
			getVideoData(currentVideo, updateVideoData);
		}
	}
}

function stopVideo() {
	ytPlayer.stopVideo();
}

function getAuthorImage(channelID) {
	var url;
	$.ajax({
  		dataType: "json",
  		async: false,
  		url: "http://gdata.youtube.com/feeds/api/users/" + channelID,
  		data: {
			fields: "media:thumbnail",
			alt: "json"
  		},
  		success: function(data) {
  			if(data.entry["media$thumbnail"]) {
				url = data.entry["media$thumbnail"].url;
  			} else {
				console.log("Could not load channel image for channel", channelID);
  			}
  		},
  		error: function() {
  			console.error("Could execute request [get channel image] for channel [", channelID, "]");
  		}
	});
	return url;
}


function getVideoData(video, callback) {
	if(cachedVideos[video]) {
		callback(cachedVideos[video]);
		return;
	}

	$.getJSON("https://www.googleapis.com/youtube/v3/videos", {
		key: "AIzaSyAYjKYfxvjLdWBj20hTjG93hj35LpUsCus",
		part: "snippet,statistics,contentDetails",
		id: video
	}, function(data) {
		if(data.items.length == 1) {
			data.items[0].channelImage = getAuthorImage(data.items[0].snippet.channelId);
			cachedVideos[video] = data.items[0];
			if(callback) {
				callback(data.items[0]);	
			} else {
				console.error("You must specify a callback for when the data for this video is loaded");
			}
		} else {
			console.error("Could not load data for video ", video);
		}
	}, function(error) {
		console.error("Could execute request [get video data] for video [", video, "]");
	});
}

function loadVideos(videos, callback) {
	var processedVideos = 0;
	videos.forEach(function(video) {
		getVideoData(video, function(data) {
			processedVideos += 1;
			if(processedVideos == videos.length) {
				if(callback) {
					callback();
				}
			}
		});
	});
}

function addVideoToPlaylist(video, index) {
	playlist.videos.push(video);
	var template = '<li class="cf"><div class="playlist-video-index"><INDEX></div><div class="playlist-video-thumb">' + 
						'<img src="<THUMBNAIL>" />' +
					'</div>' +
					'<div class="playlist-video-info">' +
						'<span class="playlist-video-title"><TITLE></span>' +
						'<span class="playlist-video-channel"><CHANNEL></span>' +
					'</div>' +
				'</li>';
	getVideoData(video, function(data) {
		var output = template.replace("<INDEX>", $(".playlist-videos li").length+1)
					.replace("<THUMBNAIL>", data.snippet.thumbnails.default.url)
					.replace("<TITLE>", data.snippet.title)
					.replace("<CHANNEL>", data.snippet.channelTitle);
	
		$(".playlist-videos").append(output);
	});
}

function HTMLize(input) {
	return input.replace(/\n/gm, "<br />");
}

function updateVideoData(data) {
	videoData = data;	

	var channelId = videoData.snippet.channelId;
	var videoTitle = videoData.snippet.title;
	var videoDescription = videoData.snippet.description;
	var publishDate = new Date(videoData.snippet.publishedAt).format("mmm dd, yyyy");


	$(".channel-thumb").attr("src", videoData.channelImage);
	$(".video-title").text(videoTitle);
	$(".video-channel").text(videoData.snippet.channelTitle);
	$(".video-publish-date span").text(publishDate);
	$(".video-description").html(HTMLize(videoDescription));
}

