<?php

require_once __DIR__ . '/functions.php';

if (count($argv) <= 2) {
  echo 'please supply Pimcore base path & document type definition (base64) names as arguments' . PHP_EOL;
  exit(1);
}

$definition = json_decode(base64_decode($argv[2]), true);
$path = $argv[1] . '/var/config/document-types.php';

$definitions = include $path;

if (in_array($definition['name'], array_column($definitions, 'name'))) {
  return;
}
$newId = max(array_keys($definitions)) + 1;
$definition['id'] = $newId;
$definitions[$newId] = $definition;

file_put_contents($path, "<?php \n\nreturn " . var_export54($definitions) . ";\n");
