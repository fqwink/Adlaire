<!doctype html>
<html lang="ja">
<head>
<?php
	$esc = function($s){ return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); };
	echo "	<meta charset='utf-8'>
	<title>".$esc($c['title'])." - ".$esc($c['page'])."</title>
	<base href='".$esc($host)."'>
	<meta name='viewport' content='width=device-width, initial-scale=1'>
	<link rel='stylesheet' href='themes/".$esc($c['themeSelect'])."/style.css'>
	<meta name='description' content='".$esc($c['description'])."'>
	<meta name='keywords' content='".$esc($c['keywords'])."'>
	<script src='//ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js'></script>";
	editTags();
?>

</head>
<body>
	<nav id="nav">
		<h1><a href='./'><?php echo htmlspecialchars($c['title'], ENT_QUOTES, 'UTF-8');?></a></h1>
		<?php menu(); ?>
		<div class="clear"></div>
	</nav>
	<?php if(is_loggedin()) settings();?>

	<div id="wrapper" class="border">
		<div class="pad">
			<?php content($c['page'],$c['content']);?>

		</div>
	</div>
	
	<div id="side" class="border">
		<div class="pad">
			<?php content('subside',$c['subside']);?>

		</div>
	</div>

	<div class="clear"></div>
	<footer>
		<p><?php echo $c['copyright'] ." | $lstatus | $apcredit";?></p>
	</footer>
</body>
</html>
