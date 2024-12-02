/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.dbtool;

import org.h2.tools.RunScript;
import org.h2.tools.Script;

import java.util.Arrays;

public class DbTool {

    public static void main(String[] args) throws Exception {

        if (args == null || args.length < 2) {
            throw new IllegalArgumentException("Expected at least two arguments but got " + (args == null ? "null" : args.length));
        }

        if (args[0].equals(Script.class.getName())) {
            Script.main(Arrays.copyOfRange(args, 1, args.length));
        } else if (args[0].equals(RunScript.class.getName())) {
            RunScript.main(Arrays.copyOfRange(args, 1, args.length));
        } else {
            throw new IllegalArgumentException("Invalid script type " + args[0]);
        }

    }
}
