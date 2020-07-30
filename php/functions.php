<?php

// https://stackoverflow.com/a/24316675
function var_export54($var, $indent = "")
{
  switch (gettype($var)) {
    case "string":
      return '"' . addcslashes($var, "\\\$\"\r\n\t\v\f") . '"';
    case "array":
      $indexed = array_keys($var) === range(0, count($var) - 1);
      $r = [];
      foreach ($var as $key => $value) {
        $r[] = "$indent    "
          . ($indexed ? "" : var_export54($key) . " => ")
          . var_export54($value, "$indent    ");
      }

      return "[\n" . implode(",\n", $r) . "\n" . $indent . "]";
    case "boolean":
      return $var ? "TRUE" : "FALSE";
    default:
      return var_export($var, TRUE);
  }
}
