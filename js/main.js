var ytPlayer;
var currentVideo;
var videoData;
var playlist = {
	videos: [],
	currentVideo: 0,
	isShuffled: false,
	isCyclical: false
};

var Keys = {
	ENTER: 13
}

var cachedVideos = {};

var initialVideos = [];
if(localStorage.getItem("playlist")) {
	initialVideos = JSON.parse(localStorage.getItem("playlist"));
}

function showGuide() {
	$("#youtube-iframe-player").hide();
	$("#empty-message").show();
	$(".playlist header h3").text("Playlist");
	$("#video-description-intro").hide();
	$("#video-description-main").hide();
	$(".playlist-videos").empty();
}

function hideGuide() {
	$("#youtube-iframe-player").show();
	$("#empty-message").hide();
	$(".playlist header h3").text("Now playing");
	$("#video-description-intro").show();
	$("#video-description-main").show();
	$("#background").css("background-image", "");	
}

if(!window.initialVideos || initialVideos.length == 0) {
	showGuide();
}

$(document).ready(function() {
	init();
});

function init() {
	loadYoutube();
	addEvents();
}

function preloadAlbumArts() {
	setTimeout(function() {
		playlist.videos.forEach(getAlbumart);
	}, 2000);	
}

function addEvents() {
	$(".sortable").sortable({
		start: function(event, ui) {
	        $(this).attr("data-previndex", ui.item.index());
	    },
	    update: function(event, ui) {
	    	
	    	var newIndex = ui.item.index();
	    	var oldIndex = $(this).attr("data-previndex");
	    	console.log("Old index: ", oldIndex, ", newIndex: ", newIndex);
	        $(this).removeAttr("data-previndex");
	        playlist.videos.move(oldIndex, newIndex);
	        
		},
		stop: function (e, ui) {
			reindexPlaylist();
			playlist.currentVideo = $(".playlist-videos .playing-vid:not(.ui-sortable-placeholder)").index();
			localStorage.setItem("playlist", JSON.stringify(playlist.videos));
		},
		receive: function(e, ui) { sortableIn = 1; },
		over: function(e, ui) { sortableIn = 1; },
		out: function(e, ui) { sortableIn = 0; },
		beforeStop: function(e, ui) {
			if (sortableIn == 0) {
				var index = ui.item.index();
				var wasCurrent = ui.item.hasClass("playing-vid");
				ui.item.remove();
				playlist.videos.splice(index, 1);
				if(playlist.videos.length == 0) {
					showGuide();
				}
				localStorage.setItem("playlist", JSON.stringify(playlist.videos));
				if(wasCurrent) {
					playVideo(index);
				}				
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
		if(playlist.videos.length == 0) {
			hideGuide();		
		}

		var video = $(this).attr("data-video-id");
		addVideoToPlaylist(video);

		if(playlist.videos.length == 1) {
			playVideo(0);
		}

		if(ytPlayer.getPlayerState() == YT.PlayerState.ENDED) {
			if(playlist.currentVideo == playlist.videos.length-2) {
				playVideo(playlist.videos.length-1);
			}
		}
	});

	$(".playlist-videos").on("click", "li", function() {
		playVideo($(this).index());
	});

	$("body").on("click", function(event) {
		if(event.target === this) {
			showNowPlaying();
		}
	});

	$(".toggle-shuffle").on("click", function() {
		var el = $(this);
		if(el.hasClass("active")) {
			el.removeClass("active");
			playlist.isShuffled = false;
		} else {
			el.addClass("active");
			playlist.isShuffled = true;
		}
	});

	$(".toggle-repeat").on("click", function() {
		var el = $(this);
		if(el.hasClass("active")) {
			el.removeClass("active");
			playlist.isCyclical = false;
		} else {
			el.addClass("active");
			playlist.isCyclical = true;
		}
	});

	$(".clear-playlist").on("click", function() {
		var check = confirm("Are you sure you want to clear this playlist?");
		if(check) {
			ytPlayer.stopVideo();
			playlist.videos = [];
			localStorage.setItem("playlist", "[]");
			playlist.currentVideo = 0;
			$(".playlist-videos").empty();
			showGuide();
		}

	});
}

function showNowPlaying() {
	$(".search-area").fadeOut();
	$(".now-playing").fadeIn();
}

function doSearch(query) {
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
	currentVideo = playlist.videos[index];
	playlist.currentVideo = index;
	ytPlayer.loadVideoById(currentVideo);
	$(".playing-vid").removeClass("playing-vid");
	$(".playlist-videos li:not(.ui-sortable-placeholder)").eq(index).addClass("playing-vid");
	var videoData = cachedVideos[currentVideo];
	updateVideoData(videoData);
	
	getAlbumart(currentVideo, function(image) {
		var img = new Image();
		img.src = image;
		img.onload = function() {
			$("#background").css("background-image", "url(" + image + ")");	
		}		
	});

}

function onPlayerReady(event) {
	if(window.initialVideos) {
		loadVideos(initialVideos, function() {
			initialVideos.forEach(addVideoToPlaylist);
			preloadAlbumArts();
			playVideo(0);
			updateVideoData(cachedVideos[currentVideo]);
		});	
	}
	
}

function updateCurrentVideo() {
	currentVideo = ytPlayer.getVideoUrl().split("v=")[1];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function onPlayerStateChange(event) {
	if (event.data == YT.PlayerState.PLAYING) {
		$("#youtube-iframe-player").addClass("ready");
	}
	if (event.data == YT.PlayerState.ENDED) {
		var hasNext = false;

		if(playlist.isShuffled) {
			console.log("Playlist is shuffled.");
			if(playlist.currentVideo < playlist.videos.length - 1) { // Check if there's a next video.
				console.log("There is a next video (i.e: i'm not in the lat one)");
				var nextVideo = getRandomInt(playlist.currentVideo+1, playlist.videos.length-1);
				console.log('calculatged nextVideo to ', nextVideo);
				playlist.currentVideo = nextVideo;
				currentVideo = playlist.videos[nextVideo];
				hasNext = true;
			} else if(playlist.currentVideo == playlist.videos.length-1) { // Check if at end of playlist
				if(playlist.isCyclical) {
					console.log("at the end of playlist, but since i'm cyclical, i'll choose a random video from the beggining");
					var nextVideo = getRandomInt(0, playlist.videos.length-1);
					playlist.currentVideo = nextVideo;
					currentVideo = playlist.videos[nextVideo];
					hasNext = true;
				} else {
					console.log("at end of playlist. shuffle is on, but since its not cyclical, this is the end");
				}
			}
		} else { // Not shuffled, proceed to default behavior
			if(playlist.currentVideo < playlist.videos.length - 1) { // Check if there's a next video.
				currentVideo = playlist.videos[playlist.currentVideo+1];
				playlist.currentVideo += 1;
				hasNext = true;
			} else if(playlist.currentVideo == playlist.videos.length-1) { // Check if at end of playlist
				if(playlist.isCyclical) {
					currentVideo = playlist.videos[0];
					playlist.currentVideo = 0;
					hasNext = true;
				}
			}
		}

		if(hasNext) {
			playVideo(playlist.currentVideo);
			getVideoData(currentVideo, updateVideoData);
		}
	}
}

function stopVideo() {
	ytPlayer.stopVideo();
}

function getAuthorImage(channelID, callback) {
	var url;
	$.ajax({
  		dataType: "json",
  		url: "http://gdata.youtube.com/feeds/api/users/" + channelID,
  		data: {
			fields: "media:thumbnail",
			alt: "json"
  		},
  		success: function(data) {
  			if(data.entry["media$thumbnail"]) {
				url = data.entry["media$thumbnail"].url;
				if(callback) {
					callback(url);
				}
  			} else {
				console.log("Could not load channel image for channel", channelID);
  			}
  		},
  		error: function() {
  			console.error("Could execute request [get channel image] for channel [", channelID, "]");
  		}
	});
}

function isFunction(obj) {
	return !!(obj && obj.constructor && obj.call && obj.apply);
}

function getAlbumart(video, callback) {
	var videoData = cachedVideos[video];

	if(videoData.albumart) {
		if(callback) {
			callback(videoData.albumart);
		}
		return;
	}

	var artist = videoData.snippet.title.split(" - ")[0];
	var track = videoData.snippet.title.split(" - ")[1];



	$.ajax({
	  dataType: "xml",
	  url: "http://musicbrainz.org/ws/2/recording/?query=" + track + "+artist:" + artist + "&limit=1",
	  success: function(xml) {
	    if(xml) {
	      console.log('got this xml: ', xml);
	      var mbid = $(xml).find('release').attr('id');
	      console.log('got this mbid: ', mbid);
	      $.getJSON("api?coverfor=" + mbid,
	      function(data) {
	        if(data.url) {
	          var image = data.url;
	          console.log('got this image: ', image);
	          videoData.albumart = image;
	          if(callback && isFunction(callback)) {
	          	callback(image);	
	          }
	          
	        } else {
	          console.error("Could not image for mbid ", mbid);
	        }
	      }, function(error) {
	        console.error("Could execute request [get cover art] for mbid [", mbid, "]");
	      });
	    } else {
	    console.log("Could not load channel image for channel", channelID);
	    }
	  },
	  error: function() {
	    console.error("Could execute request [get album mbid]");
	  }
	});
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
			getAuthorImage(data.items[0].snippet.channelId, function(channeThumb) {
				data.items[0].channelImage = channeThumb;
				cachedVideos[video] = data.items[0];
				if(callback) {
					callback(data.items[0]);	
				} else {
					console.error("You must specify a callback for when the data for this video is loaded");
				}	
			});
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
	localStorage.setItem("playlist", JSON.stringify(playlist.videos));
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

