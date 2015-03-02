<?php
	error_reporting(E_ERROR | E_PARSE);
	$url = "http://coverartarchive.org/release-group/" . $_GET["coverfor"];
	$json = file_get_contents($url);
	$json_data = json_decode($json, true);

	if($json_data["images"][0]["image"] != "") {
		header('Content-Type: application/json');
		echo '{"url": "' . $json_data["images"][0]["image"] . '"}';
	} else {
		http_response_code(400);
	}
?>