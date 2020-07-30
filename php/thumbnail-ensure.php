<?php

require_once __DIR__.'/functions.php';

if (count($argv) <= 2) {
  echo 'please supply Pimcore base path & thumbnail definition names as arguments' . PHP_EOL;
  exit(1);
}

function makeDefinition($name)
{
  return [
    'items' => [],
    'medias' => [],
    'name' => $name,
    'description' => '',
    'group' => '',
    'format' => 'SOURCE',
    'quality' => 85,
    'highResolution' => 0.0,
    'preserveColor' => false,
    'preserveMetaData' => false,
    'rasterizeSVG' => false,
    'downloadable' => false,
    'modificationDate' => time(),
    'creationDate' => time(),
    'forcePictureTag' => false,
    'id' => $name,
  ];
}

$path = $argv[1] . '/var/config/image-thumbnails.php';
$definitions = include $path;
$existingNames = array_keys($definitions);
$newNames = $argv;
array_shift($newNames);
array_shift($newNames);
if (!count(array_diff($newNames, $existingNames))) {
  return;
}
foreach (array_diff($newNames, $existingNames) as $name) {
  $definitions[$name] = makeDefinition($name);
}

// Pimcore uses Dao in vendor/pimcore/pimcore/models/Asset/Image/Thumbnail/Config/Dao.php for this
file_put_contents($path, "<?php \n\nreturn " . var_export54($definitions) . ";\n");
