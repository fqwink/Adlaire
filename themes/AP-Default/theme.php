<?php declare(strict_types=1);
/** @var App $app */
$c = $app->config;
$host = $app->host;
?>
<!doctype html>
<html lang="<?= esc($app->language) ?>">
<head>
	<meta charset="utf-8">
	<title><?= esc($c['title']) ?> - <?= esc($c['page']) ?></title>
	<base href="<?= esc($host) ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="themes/<?= esc($c['themeSelect']) ?>/style.css">
	<meta name="description" content="<?= esc($c['description']) ?>">
	<meta name="keywords" content="<?= esc($c['keywords']) ?>">
<?php $app->scriptTags(); ?>
<?php $app->editTags(); ?>
</head>
<body>
	<nav id="nav">
		<h1><a href="./"><?= esc($c['title']) ?></a></h1>
		<?php $app->menu(); ?>
		<div class="clear"></div>
	</nav>
	<?php if ($app->isLoggedIn()) { $app->settings(); } ?>

	<div id="wrapper" class="border">
		<div class="pad">
			<?php $app->content($c['page'], $c['content'] ?? ''); ?>
		</div>
	</div>

	<div id="side" class="border">
		<div class="pad">
			<?php $app->content('subside', $c['subside']); ?>
		</div>
	</div>

	<div class="clear"></div>
	<footer>
		<p><?= $c['copyright'] ?> | <?= $app->getLoginStatus() ?> | <?= $app->credit ?></p>
	</footer>
</body>
</html>
