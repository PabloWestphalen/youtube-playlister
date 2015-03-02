<?php
	header('Content-Type: application/json');
	$url = "http://coverartarchive.org/release/" . $_GET["coverfor"];
	$json = file_get_contents($url);
	$json_data = json_decode($json, true);
	echo '{"url": "' . $json_data["images"][0]["image"] . '"}';
?>