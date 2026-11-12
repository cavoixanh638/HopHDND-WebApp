/** Private first-import receipt containment check.
 * Inputs have already been canonicalized by realpathSync(checkout) and
 * resolve(realpathSync(dirname(receipt)), basename(receipt)) at the CLI.
 * Use platform path operations: on Windows separators are backslashes and
 * relative() can return an ABSOLUTE path when target is on another drive.
 *
 * pathApi injection is for the cross-platform regression; production calls
 * this with the native Node path implementation.
 */
import path from 'node:path';

export function isReceiptInsideCheckout(checkout,target,pathApi=path){
 const relative=pathApi.relative(checkout,target);
 return relative==='' ||
   (relative!=='..' &&
    !relative.startsWith('..'+pathApi.sep) &&
    !pathApi.isAbsolute(relative));
}
