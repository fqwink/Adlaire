<?php declare(strict_types=1);
/** @var App $app */
$c = $app->config;
$host = $app->host;
$pageTitle = (string) ($c['title'] ?? '');
$pageName = (string) ($c['page'] ?? '');
$pageDescription = (string) ($c['description'] ?? '');
$pageKeywords = (string) ($c['keywords'] ?? '');
$pageCopyright = (string) ($c['copyright'] ?? '');
$pageContent = (string) ($c['content'] ?? '');
$pageSubside = (string) ($c['subside'] ?? '');
$pageTheme = (string) ($c['themeSelect'] ?? 'AP-Default');
?>
<!doctype html>
<html lang="<?= esc($app->language) ?>">
<head>
	<meta charset="utf-8">
	<title><?= esc($pageTitle) ?> - <?= esc($pageName) ?></title>
	<base href="<?= esc($host) ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="stylesheet" href="themes/<?= esc($pageTheme) ?>/style.css">
	<meta name="description" content="<?= esc($pageDescription) ?>">
	<meta name="keywords" content="<?= esc($pageKeywords) ?>">
<?php $app->scriptTags(); ?>
</head>
<body>
	<nav id="nav">
		<h1><a href="./"><?= esc($pageTitle) ?></a></h1>
		<?php $app->menu(); ?>
		<div class="clear"></div>
	</nav>

	<div id="wrapper" class="border">
		<div class="pad">
			<?php $app->content($pageName, $pageContent); ?>
		</div>
	</div>

	<div id="side" class="border">
		<div class="pad">
			<?php $app->content('subside', $pageSubside); ?>
		</div>
	</div>

	<div class="clear"></div>
	<footer>
		<p><?= esc($pageCopyright) ?> | <?= $app->getLoginStatus() ?> | <?= esc($app->credit) ?></p>
	</footer>
</body>
</html>
