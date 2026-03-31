<?php
/**
*
*@copyright Copyright (c) 2014 - 2015 IEAS Group
*@copyright Copyright (c) 2014 - 2015 AIZM
*@license　Adlaire License
*
*/

ob_start();
ini_set('session.cookie_httponly', 1);
session_start();

function csrf_token() {
	if (empty($_SESSION['csrf'])) {
		$_SESSION['csrf'] = bin2hex(random_bytes(32));
	}
	return $_SESSION['csrf'];
}
function csrf_verify() {
	if (empty($_POST['csrf']) || !hash_equals($_SESSION['csrf'] ?? '', $_POST['csrf'])) {
		header('HTTP/1.1 403 Forbidden');
		exit;
	}
}

host();
edit();

$c['password'] = 'admin';
$c['loggedin'] = false;
$c['page'] = 'home';
$d['page']['home'] = "<h3>Your website is now powered by Adlaire Platform.</h3><br />\nLogin with the 'Login' link below. The password is admin.<br />\nChange the password as soon as possible.<br /><br />\n\nClick on the content to edit and click outside to save it.<br />";
$d['page']['example'] = "This is an example page.<br /><br />\n\nTo add a new one, click on the existing pages (in the admin panel) and enter a new one below the others.";
$d['new_page']['admin'] = "Page <b>".htmlspecialchars($rp ?? '', ENT_QUOTES, 'UTF-8')."</b> created.<br /><br />\n\nClick here to start editing!";
$d['new_page']['visitor'] = "Sorry, but <b>".htmlspecialchars($rp ?? '', ENT_QUOTES, 'UTF-8')."</b> doesn't exist. :(";
$d['default']['content'] = 'Click to edit!';
$c['themeSelect'] = 'AP-Default';
$c['menu'] = "Home<br />\nExample";
$c['title'] = 'Website title';
$c['subside'] = "<h3>ABOUT YOUR WEBSITE</h3><br />\n\n This content is static and is visible on all pages.";
$c['description'] = 'Your website description.';
$c['keywords'] = 'enter, your website, keywords';
$c['copyright'] = '&copy;'.date('Y').' Your website';
$apcredit = "Powered by <a href=''>Adlaire Platform</a>";
$hook['admin-richText'] = "rte.php";

if(!file_exists('files')){
	mkdir('files', 0755, true);
	mkdir('plugins', 0755, true);
}

foreach($c as $key => $val){
	if($key == 'content') continue;
	$fpath = 'files/'.$key;
	$fval = file_exists($fpath) ? file_get_contents($fpath) : false;
	$d['default'][$key] = $c[$key];
	if($fval)
		$c[$key] = $fval;
	switch($key){
		case 'password':
			if(!$fval)
				$c[$key] = savePassword($val);
			break;
		case 'loggedin':
			if(isset($_SESSION['l']) and $_SESSION['l'] === $c['password'])
				$c[$key] = true;
			if(isset($_REQUEST['logout'])){
				session_destroy();
				header('Location: ./');
				exit;
			}
			if(isset($_REQUEST['login'])){
				if(is_loggedin())
					header('Location: ./');
				$msg = '';
				if(isset($_POST['sub']))
					login();
				$csrf = csrf_token();
				$c['content'] = "<form action='' method='POST'>
				<input type='hidden' name='csrf' value='".$csrf."'>
				<input type='password' name='password'>
				<input type='submit' name='login' value='Login'> $msg
				<p class='toggle'>Change password</p>
				<div class='hide'>Type your old password above and your new one below.<br />
				<input type='password' name='new'>
				<input type='submit' name='login' value='Change'>
				<input type='hidden' name='sub' value='sub'>
				</div>
				</form>";
			}
			$lstatus = (is_loggedin()) ? "<a href='$host?logout'>Logout</a>" : "<a href='$host?login'>Login</a>";
			break;
		case 'page':
			if($rp)
				$c[$key] = $rp;
			$c[$key] = getSlug($c[$key]);
			if(isset($_REQUEST['login'])) continue;
			$pagefile = "files/".$c[$key];
			$c['content'] = file_exists($pagefile) ? file_get_contents($pagefile) : false;
			if(!$c['content']){
				if(!isset($d['page'][$c[$key]])){
					header('HTTP/1.1 404 Not Found');
					$c['content'] = (is_loggedin()) ? $d['new_page']['admin'] : $c['content'] = $d['new_page']['visitor'];
				} else{
					$c['content'] = $d['page'][$c[$key]];
				}
			}
			break;
		default:
			break;
	}
}
loadPlugins();

require("themes/".$c['themeSelect']."/theme.php");

function loadPlugins(){
	global $hook, $c;
	$cwd = getcwd();
	if(chdir("./plugins/")){
		$dirs = glob('*', GLOB_ONLYDIR);
		if(is_array($dirs))
			foreach($dirs as $dir){
				require_once($cwd.'/plugins/'.$dir.'/index.php');
			}
	}
	chdir($cwd);
	$hook['admin-head'][] = "\n	<script type='text/javascript' src='./js/editInplace.php?hook=".$hook['admin-richText']."'></script>";
}

function getSlug($p){
	return mb_convert_case(str_replace(' ', '-', $p), MB_CASE_LOWER, "UTF-8");
}

function is_loggedin(){
	global $c;
	return $c['loggedin'];
}

function editTags(){
	global $hook;
	if(!is_loggedin() && !isset($_REQUEST['login']))
		return;
	echo "\t<script>var csrfToken='".csrf_token()."';</script>\n";
	foreach($hook['admin-head'] as $o){
		echo "\t".$o."\n";
	}
}

function content($id, $content){
	global $d;
	$safe_id = htmlspecialchars($id, ENT_QUOTES, 'UTF-8');
	$safe_title = htmlspecialchars($d['default']['content'], ENT_QUOTES, 'UTF-8');
	echo (is_loggedin()) ? "<span title='".$safe_title."' id='".$safe_id."' class='editText richText'>".$content."</span>" : $content;
}

function edit(){
	if(isset($_REQUEST['fieldname'], $_REQUEST['content'])){
		$fieldname = basename($_REQUEST['fieldname']);
		if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $fieldname)) {
			header('HTTP/1.1 400 Bad Request');
			exit;
		}
		$content = trim($_REQUEST['content']);
		if(!isset($_SESSION['l'])){
			header('HTTP/1.1 401 Unauthorized');
			exit;
		}
		csrf_verify();
		$filepath = __DIR__ . '/files/' . $fieldname;
		$file = @fopen($filepath, "w");
		if(!$file){
			echo 'Set 755 permission to the files folder.';
			exit;
		}
		fwrite($file, $content);
		fclose($file);
		echo $content;
		exit;
	}
}

function menu(){
	global $c, $host;
	$mlist = explode("<br />\n", $c['menu']);
	?><ul>
	<?php
	foreach ($mlist as $cp){
		$slug = getSlug($cp);
		$safe_cp = htmlspecialchars($cp, ENT_QUOTES, 'UTF-8');
		$safe_slug = htmlspecialchars($slug, ENT_QUOTES, 'UTF-8');
	?>
			<li<?php if($c['page'] == $slug) echo ' id="active" '; ?>><a href='<?php echo $safe_slug; ?>'><?php echo $safe_cp; ?></a></li>
	<?php } ?>
	</ul>
<?php
}

function login(){
	global $c, $msg;
	csrf_verify();
	$stored = $c['password'];
	$input = $_POST['password'];

	// Detect legacy MD5 hash (32 hex chars) vs bcrypt
	if (strlen($stored) === 32 && ctype_xdigit($stored)) {
		$valid = (md5($input) === $stored);
		// Auto-migrate to bcrypt on successful login
		if ($valid) {
			savePassword($input);
			$c['password'] = file_get_contents('files/password');
		}
	} else {
		$valid = password_verify($input, $stored);
	}

	if (!$valid) {
		$msg = 'wrong password';
		return;
	}
	if (!empty($_POST['new'])) {
		savePassword($_POST['new']);
		$msg = 'password changed';
		return;
	}
	session_regenerate_id(true);
	$_SESSION['l'] = $c['password'];
	header('Location: ./');
	exit;
}

function savePassword($p){
	$hash = password_hash($p, PASSWORD_DEFAULT);
	$file = @fopen('files/password', 'w');
	if(!$file){
		echo 'Set 644 permission to the password file.';
		exit;
	}
	fwrite($file, $hash);
	fclose($file);
	return $hash;
}

function host(){
	global $host, $rp;
	$rp = preg_replace('#/+#', '/', (isset($_REQUEST['page'])) ? urldecode($_REQUEST['page']) : '');
	$host = $_SERVER['HTTP_HOST'];
	$uri = preg_replace('#/+#', '/', urldecode($_SERVER['REQUEST_URI']));
	$host = (strrpos($uri, $rp) !== false) ? $host.'/'.substr($uri, 0, strlen($uri) - strlen($rp)) : $host.'/'.$uri;
	$host = explode('?', $host);
	$host = '//'.str_replace('//', '/', $host[0]);
	$strip = array('index.php','?','"','\'','>','<','=','(',')','\\');
	$rp = strip_tags(str_replace($strip, '', $rp));
	$host = strip_tags(str_replace($strip, '', $host));
}

function settings(){
	global $c, $d;
	echo "<div class='settings'>
	<h3 class='toggle'>↕ Settings ↕</h3>
	<div class='hide'>
	<div class='change border'><b>Theme</b>&nbsp;<span id='themeSelect'><select name='themeSelect' onchange='fieldSave(\"themeSelect\",this.value);'>";
	if(chdir("./themes/")){
		$dirs = glob('*', GLOB_ONLYDIR);
		foreach($dirs as $val){
			$safe_val = htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
			$select = ($val == $c['themeSelect']) ? ' selected' : '';
			echo '<option value="'.$safe_val.'"'.$select.'>'.$safe_val."</option>\n";
		}
	}
	echo "</select></span></div>
	<div class='change border'><b>Menu <small>(add a page below and <a href='javascript:location.reload(true);'>refresh</a>)</small></b><span id='menu' title='Home' class='editText'>".$c['menu']."</span></div>";
	foreach(array('title','description','keywords','copyright') as $key){
		$safe_default = htmlspecialchars($d['default'][$key], ENT_QUOTES, 'UTF-8');
		$safe_value = htmlspecialchars($c[$key], ENT_QUOTES, 'UTF-8');
		echo "<div class='change border'><span title='".$safe_default."' id='".$key."' class='editText'>".$safe_value."</span></div>";
	}
	echo "</div></div>";
}
ob_end_flush();
?>
